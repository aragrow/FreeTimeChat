/**
 * MessageRating Component
 *
 * Phase 6: Response Rating UI
 * Allows users to rate assistant messages with BAD/OK/GOOD feedback
 * Supports optional text feedback and updates existing ratings
 */

'use client';

import { useState } from 'react';

export type RatingValue = 'BAD' | 'OK' | 'GOOD';
export type RatingType = 'PREVIEW' | 'REPORT';

export interface Rating {
  id: string;
  messageId: string;
  userId: string;
  ratingType: RatingType;
  rating: RatingValue;
  feedback?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface MessageRatingProps {
  messageId: string;
  existingRating?: Rating;
  onRatingSubmit: (rating: RatingValue, feedback?: string) => Promise<void>;
  ratingType?: RatingType;
}

export function MessageRating({
  messageId,
  existingRating,
  onRatingSubmit,
  ratingType: _ratingType = 'REPORT',
}: MessageRatingProps) {
  const [selectedRating, setSelectedRating] = useState<RatingValue | null>(
    existingRating?.rating || null
  );
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState(existingRating?.feedback || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHovering, setIsHovering] = useState<RatingValue | null>(null);

  const handleRatingClick = async (rating: RatingValue) => {
    setSelectedRating(rating);
    setIsSubmitting(true);

    try {
      await onRatingSubmit(rating, feedback || undefined);
    } catch (error) {
      console.error('Failed to submit rating:', error);
      // Revert selection on error
      setSelectedRating(existingRating?.rating || null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!selectedRating) return;

    setIsSubmitting(true);
    try {
      await onRatingSubmit(selectedRating, feedback || undefined);
      setShowFeedback(false);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingIcon = (rating: RatingValue) => {
    switch (rating) {
      case 'BAD':
        return '👎';
      case 'OK':
        return '👌';
      case 'GOOD':
        return '👍';
    }
  };

  const getRatingColor = (rating: RatingValue, isSelected: boolean, isHovered: boolean) => {
    if (isSubmitting) return 'text-gray-400';

    if (isSelected) {
      switch (rating) {
        case 'BAD':
          return 'text-red-500';
        case 'OK':
          return 'text-yellow-500';
        case 'GOOD':
          return 'text-green-500';
      }
    }

    if (isHovered) {
      switch (rating) {
        case 'BAD':
          return 'text-red-400';
        case 'OK':
          return 'text-yellow-400';
        case 'GOOD':
          return 'text-green-400';
      }
    }

    return 'text-gray-400 hover:text-gray-600';
  };

  const getRatingLabel = (rating: RatingValue) => {
    switch (rating) {
      case 'BAD':
        return 'Not helpful';
      case 'OK':
        return 'Somewhat helpful';
      case 'GOOD':
        return 'Very helpful';
    }
  };

  return (
    <div className="flex flex-col gap-2 mt-2">
      {/* Rating Buttons */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Rate this response:</span>
        <div className="flex items-center gap-1">
          {(['BAD', 'OK', 'GOOD'] as RatingValue[]).map((rating) => (
            <button
              key={rating}
              onClick={() => handleRatingClick(rating)}
              onMouseEnter={() => setIsHovering(rating)}
              onMouseLeave={() => setIsHovering(null)}
              disabled={isSubmitting}
              className={`
                p-1.5 rounded transition-all duration-200
                ${selectedRating === rating ? 'bg-gray-100 scale-110' : 'hover:bg-gray-50'}
                ${isSubmitting ? 'cursor-wait opacity-50' : 'cursor-pointer'}
                ${getRatingColor(rating, selectedRating === rating, isHovering === rating)}
              `}
              title={getRatingLabel(rating)}
              aria-label={getRatingLabel(rating)}
            >
              <span className="text-lg">{getRatingIcon(rating)}</span>
            </button>
          ))}
        </div>

        {/* Feedback Button */}
        {selectedRating && !showFeedback && (
          <button
            onClick={() => setShowFeedback(true)}
            className="text-xs text-blue-600 hover:text-blue-700 underline ml-2"
            disabled={isSubmitting}
          >
            {existingRating?.feedback ? 'Edit feedback' : 'Add feedback'}
          </button>
        )}
      </div>

      {/* Feedback Input */}
      {showFeedback && (
        <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg">
          <label htmlFor={`feedback-${messageId}`} className="text-xs font-medium text-gray-700">
            Optional feedback (help us improve):
          </label>
          <textarea
            id={`feedback-${messageId}`}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Tell us more about your experience..."
            className="
              w-full p-2 text-sm border border-gray-300 rounded
              focus:outline-none focus:ring-2 focus:ring-blue-500
              min-h-[60px] resize-y
            "
            maxLength={2000}
            disabled={isSubmitting}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">{feedback.length}/2000 characters</span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowFeedback(false);
                  setFeedback(existingRating?.feedback || '');
                }}
                className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleFeedbackSubmit}
                disabled={isSubmitting}
                className="
                  px-3 py-1 text-xs text-white bg-blue-600 rounded
                  hover:bg-blue-700 disabled:opacity-50 disabled:cursor-wait
                "
              >
                {isSubmitting ? 'Saving...' : 'Save feedback'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Status */}
      {selectedRating && !showFeedback && existingRating && (
        <p className="text-xs text-gray-500">
          {existingRating.feedback
            ? 'Thanks for your feedback!'
            : 'Rating saved. Add feedback to help us improve.'}
        </p>
      )}
    </div>
  );
}
