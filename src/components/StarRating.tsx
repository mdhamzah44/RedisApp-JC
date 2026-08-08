import { Star } from "lucide-react";

export function StarRating({
  rating,
  count,
  size = 14,
}: {
  rating: number;
  count?: number;
  size?: number;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <span className="flex" aria-label={`Rated ${rating} out of 5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            width={size}
            height={size}
            className={
              i <= Math.round(rating)
                ? "fill-brand text-brand"
                : "fill-muted text-muted-foreground/40"
            }
          />
        ))}
      </span>
      <span className="font-medium text-foreground">{rating.toFixed(1)}</span>
      {count != null && <span>({count.toLocaleString("en-IN")})</span>}
    </span>
  );
}
