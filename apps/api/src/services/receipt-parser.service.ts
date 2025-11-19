/**
 * Receipt Parser Service
 *
 * Uses LLM vision capabilities to extract expense data from receipt images
 */

import { getLLMService } from '../integrations/llm/llm.service';
import type { LLMMessage } from '../integrations/llm/types';

export interface ParsedReceiptData {
  vendor?: string;
  description?: string;
  amount?: number;
  currency?: string;
  date?: string;
  paymentMethod?: string;
  reference?: string;
  taxAmount?: number;
  subtotal?: number;
  items?: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    amount?: number;
  }>;
  category?: string;
  confidence: number;
  rawText?: string;
}

const RECEIPT_PARSING_PROMPT = `You are an expert at extracting structured data from receipt images. Analyze the provided receipt image and extract the following information:

1. **Vendor/Merchant Name**: The name of the store or business
2. **Description**: A brief description of the purchase (e.g., "Office supplies", "Lunch meeting")
3. **Total Amount**: The final amount paid
4. **Currency**: The currency code (e.g., USD, EUR, GBP)
5. **Date**: The date of the transaction (format: YYYY-MM-DD)
6. **Payment Method**: How the purchase was paid (Cash, Credit Card, Debit Card, etc.)
7. **Receipt Number/Reference**: Any receipt or transaction number
8. **Tax Amount**: The tax charged, if shown separately
9. **Subtotal**: The amount before tax, if shown separately
10. **Line Items**: Individual items purchased, if visible
11. **Suggested Category**: Suggest an expense category from this list:
    - Office Supplies
    - Travel
    - Meals & Entertainment
    - Software & Subscriptions
    - Equipment
    - Professional Services
    - Utilities
    - Marketing & Advertising
    - Insurance
    - Taxes & Licenses
    - Rent
    - Maintenance & Repairs
    - Shipping & Postage
    - Training & Education
    - Bank Fees
    - Miscellaneous

Respond in JSON format only. Use null for any fields you cannot determine. Be accurate and conservative - only include data you can clearly read.

Example response format:
{
  "vendor": "Staples",
  "description": "Office supplies",
  "amount": 45.99,
  "currency": "USD",
  "date": "2024-01-15",
  "paymentMethod": "Credit Card",
  "reference": "TXN-123456",
  "taxAmount": 3.67,
  "subtotal": 42.32,
  "items": [
    {"description": "Printer Paper", "quantity": 2, "unitPrice": 15.99, "amount": 31.98},
    {"description": "Pens (Box)", "quantity": 1, "unitPrice": 10.34, "amount": 10.34}
  ],
  "category": "Office Supplies",
  "confidence": 0.95,
  "rawText": "Full text extracted from receipt..."
}`;

export class ReceiptParserService {
  /**
   * Parse a receipt image and extract expense data
   */
  async parseReceipt(
    imageBuffer: Buffer,
    mimeType: string,
    tenantId: string | null = null
  ): Promise<ParsedReceiptData> {
    const llmService = getLLMService();

    // Get provider for tenant (or system-wide)
    const provider = await llmService.getProviderForTenant(tenantId);

    if (!provider) {
      throw new Error('No LLM provider configured for receipt parsing');
    }

    // Check if provider supports vision
    const capabilities = provider.getCapabilities();
    if (!capabilities.vision) {
      throw new Error(`Provider ${provider.getProviderName()} does not support vision capabilities`);
    }

    // Convert buffer to base64
    const base64Image = imageBuffer.toString('base64');
    const imageDataUrl = `data:${mimeType};base64,${base64Image}`;

    // Build message with image
    const messages: LLMMessage[] = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: RECEIPT_PARSING_PROMPT,
          },
          {
            type: 'image_url',
            image_url: {
              url: imageDataUrl,
            },
          },
        ],
      },
    ];

    try {
      const response = await provider.complete(messages, {
        temperature: 0.1, // Low temperature for accurate extraction
        maxTokens: 2000,
      });

      // Parse the JSON response
      const parsedData = this.parseResponse(response.content);
      return parsedData;
    } catch (error) {
      console.error('Receipt parsing error:', error);
      throw new Error(`Failed to parse receipt: ${(error as Error).message}`);
    }
  }

  /**
   * Parse a receipt from a URL
   */
  async parseReceiptFromUrl(
    imageUrl: string,
    tenantId: string | null = null
  ): Promise<ParsedReceiptData> {
    const llmService = getLLMService();
    const provider = await llmService.getProviderForTenant(tenantId);

    if (!provider) {
      throw new Error('No LLM provider configured for receipt parsing');
    }

    const capabilities = provider.getCapabilities();
    if (!capabilities.vision) {
      throw new Error(`Provider ${provider.getProviderName()} does not support vision capabilities`);
    }

    const messages: LLMMessage[] = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: RECEIPT_PARSING_PROMPT,
          },
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
            },
          },
        ],
      },
    ];

    try {
      const response = await provider.complete(messages, {
        temperature: 0.1,
        maxTokens: 2000,
      });

      return this.parseResponse(response.content);
    } catch (error) {
      console.error('Receipt parsing error:', error);
      throw new Error(`Failed to parse receipt: ${(error as Error).message}`);
    }
  }

  /**
   * Parse the LLM response and extract structured data
   */
  private parseResponse(content: string): ParsedReceiptData {
    try {
      // Try to extract JSON from the response
      let jsonStr = content;

      // Handle cases where the response includes markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      // Parse the JSON
      const data = JSON.parse(jsonStr);

      // Validate and normalize the data
      return {
        vendor: data.vendor || undefined,
        description: data.description || undefined,
        amount: typeof data.amount === 'number' ? data.amount : undefined,
        currency: data.currency || 'USD',
        date: data.date || undefined,
        paymentMethod: data.paymentMethod || undefined,
        reference: data.reference || undefined,
        taxAmount: typeof data.taxAmount === 'number' ? data.taxAmount : undefined,
        subtotal: typeof data.subtotal === 'number' ? data.subtotal : undefined,
        items: Array.isArray(data.items) ? data.items : undefined,
        category: data.category || undefined,
        confidence: typeof data.confidence === 'number' ? data.confidence : 0.5,
        rawText: data.rawText || undefined,
      };
    } catch (error) {
      console.error('Failed to parse receipt response:', error);

      // Return minimal data with low confidence
      return {
        confidence: 0,
        rawText: content,
      };
    }
  }

  /**
   * Match parsed category to system category ID
   */
  async matchCategory(
    parsedCategory: string,
    categories: Array<{ id: string; name: string }>
  ): Promise<string | null> {
    if (!parsedCategory) {
      return null;
    }

    // Exact match
    const exactMatch = categories.find(
      c => c.name.toLowerCase() === parsedCategory.toLowerCase()
    );
    if (exactMatch) {
      return exactMatch.id;
    }

    // Fuzzy match - check if category name is contained
    const fuzzyMatch = categories.find(
      c => c.name.toLowerCase().includes(parsedCategory.toLowerCase()) ||
           parsedCategory.toLowerCase().includes(c.name.toLowerCase())
    );
    if (fuzzyMatch) {
      return fuzzyMatch.id;
    }

    // Default to Miscellaneous
    const miscCategory = categories.find(
      c => c.name.toLowerCase() === 'miscellaneous'
    );
    return miscCategory?.id || null;
  }

  /**
   * Generate a description from parsed data if not provided
   */
  generateDescription(data: ParsedReceiptData): string {
    if (data.description) {
      return data.description;
    }

    const parts: string[] = [];

    if (data.vendor) {
      parts.push(data.vendor);
    }

    if (data.items && data.items.length > 0) {
      if (data.items.length === 1) {
        parts.push(data.items[0].description);
      } else {
        parts.push(`${data.items.length} items`);
      }
    }

    if (data.category) {
      parts.push(`(${data.category})`);
    }

    return parts.join(' - ') || 'Receipt expense';
  }
}

// Singleton instance
let receiptParserServiceInstance: ReceiptParserService | null = null;

/**
 * Get ReceiptParserService singleton instance
 */
export function getReceiptParserService(): ReceiptParserService {
  if (!receiptParserServiceInstance) {
    receiptParserServiceInstance = new ReceiptParserService();
  }
  return receiptParserServiceInstance;
}
