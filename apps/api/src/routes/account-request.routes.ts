/**
 * Account Request Routes
 *
 * Public endpoint for users to request account access
 * Includes spam prevention measures
 */

import { Router } from 'express';
import { PrismaClient as MainPrismaClient } from '../generated/prisma-main';
import type { Request, Response } from 'express';

const router = Router();
const prisma = new MainPrismaClient();

// Simple in-memory rate limiting (for production, use Redis)
const requestTracker = new Map<string, { count: number; resetTime: number }>();

// Clean up old entries every 10 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [ip, data] of requestTracker.entries()) {
      if (now > data.resetTime) {
        requestTracker.delete(ip);
      }
    }
  },
  10 * 60 * 1000
);

/**
 * POST /api/v1/account-requests
 * Submit an account access request
 *
 * Spam prevention:
 * - Honeypot field check
 * - Rate limiting (max 3 requests per hour per IP)
 * - Email validation
 * - Required fields validation
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      fullName,
      email,
      companyName,
      jobTitle,
      phone,
      reasonForAccess,
      howHeardAboutUs,
      // Honeypot field - if filled, it's likely a bot
      website,
    } = req.body;

    // Spam Prevention 1: Honeypot field
    if (website) {
      // Silently reject spam (don't give feedback to bot)
      return res.status(200).json({
        status: 'success',
        message: 'Your request has been submitted successfully. We will review it shortly.',
      });
    }

    // Spam Prevention 2: Rate limiting
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || 'unknown';
    const now = Date.now();
    const tracker = requestTracker.get(clientIp);

    if (tracker) {
      if (now < tracker.resetTime) {
        if (tracker.count >= 3) {
          return res.status(429).json({
            status: 'error',
            message: 'Too many requests. Please try again in an hour.',
          });
        }
        tracker.count++;
      } else {
        // Reset time passed, start new window
        requestTracker.set(clientIp, { count: 1, resetTime: now + 60 * 60 * 1000 });
      }
    } else {
      // First request from this IP
      requestTracker.set(clientIp, { count: 1, resetTime: now + 60 * 60 * 1000 });
    }

    // Validation
    if (!fullName || !email || !companyName || !jobTitle || !reasonForAccess) {
      return res.status(400).json({
        status: 'error',
        message: 'Please fill in all required fields.',
        errors: {
          fullName: !fullName ? 'Full name is required' : undefined,
          email: !email ? 'Email is required' : undefined,
          companyName: !companyName ? 'Company name is required' : undefined,
          jobTitle: !jobTitle ? 'Job title is required' : undefined,
          reasonForAccess: !reasonForAccess ? 'Reason for access is required' : undefined,
        },
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide a valid email address.',
      });
    }

    // Check if email already has a pending request
    const existingRequest = await prisma.accountRequest.findFirst({
      where: {
        email,
        status: 'PENDING',
      },
    });

    if (existingRequest) {
      return res.status(400).json({
        status: 'error',
        message:
          'An account request with this email is already pending review. Please wait for our response.',
      });
    }

    // Get user agent for spam detection
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Create account request
    const accountRequest = await prisma.accountRequest.create({
      data: {
        fullName,
        email,
        companyName,
        jobTitle,
        phone: phone || null,
        reasonForAccess,
        howHeardAboutUs: howHeardAboutUs || null,
        ipAddress: clientIp,
        userAgent,
        status: 'PENDING',
      },
    });

    // TODO: Send notification to admins
    // For now, just log it
    console.log('🆕 New account request received:', {
      id: accountRequest.id,
      email: accountRequest.email,
      fullName: accountRequest.fullName,
      companyName: accountRequest.companyName,
    });

    res.status(201).json({
      status: 'success',
      message:
        'Thank you for your request! We will review your application and get back to you within 1-2 business days.',
      data: {
        requestId: accountRequest.id,
      },
    });
  } catch (error) {
    console.error('Error creating account request:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to submit account request. Please try again later.',
    });
  }
});

export default router;
