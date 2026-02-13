/**
 * Reviews Section Component
 * Displays Google Places reviews for ISP providers
 */

import { Star } from 'lucide-react';

const ReviewsSection = ({ provider, reviews, isLoading }) => {
  // Show loading state
  if (isLoading) {
    return (
      <div className="mt-4 pt-4 border-t">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
          <span className="text-xs text-muted-foreground">Loading reviews...</span>
        </div>
      </div>
    );
  }

  // Hide if no reviews available
  if (!reviews || reviews.reviews.length === 0) {
    return null;
  }

  // Hide if there's an error (silently fail)
  if (reviews.source === 'Unavailable' || reviews.source === 'Error') {
    return null;
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
      {/* Header with overall rating */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-sm text-foreground">Customer Reviews</h4>
        <div className="flex items-center space-x-2">
          {/* Star rating */}
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-3 w-3 ${
                  i < Math.floor(reviews.overallRating)
                    ? 'text-yellow-400 fill-current'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
              />
            ))}
          </div>
          {/* Rating text */}
          <span className="text-xs text-muted-foreground">
            {reviews.overallRating.toFixed(1)} ({reviews.totalReviews.toLocaleString()} reviews)
          </span>
        </div>
      </div>

      {/* Review list - show top 2 */}
      <div className="space-y-2">
        {reviews.reviews.slice(0, 2).map((review, idx) => (
          <div
            key={idx}
            className="text-xs bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            {/* Review header */}
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-foreground">{review.author}</span>
              <div className="flex items-center space-x-1">
                {/* Individual review stars */}
                {[...Array(review.rating)].map((_, i) => (
                  <Star key={i} className="h-2.5 w-2.5 text-yellow-400 fill-current" />
                ))}
                {/* Empty stars */}
                {[...Array(5 - review.rating)].map((_, i) => (
                  <Star key={`empty-${i}`} className="h-2.5 w-2.5 text-gray-300 dark:text-gray-600" />
                ))}
              </div>
            </div>

            {/* Review text */}
            <p className="text-muted-foreground line-clamp-3 leading-relaxed">
              {review.text}
            </p>

            {/* Review time */}
            {review.relativeTime && (
              <p className="text-xs text-muted-foreground mt-1 opacity-70">
                {review.relativeTime}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Link to see all reviews on Google */}
      <a
        href={`https://www.google.com/maps/search/${encodeURIComponent(provider + ' store')}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-3 inline-block"
      >
        See all reviews on Google Maps →
      </a>

      {/* Source attribution */}
      <p className="text-xs text-muted-foreground mt-2 opacity-60">
        Reviews from Google Places
      </p>
    </div>
  );
};

export default ReviewsSection;
