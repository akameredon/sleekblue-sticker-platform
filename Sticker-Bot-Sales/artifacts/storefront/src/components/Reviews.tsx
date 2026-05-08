import { useState } from "react";
import {
  useListProductReviews,
  useCreateProductReview,
  getListProductReviewsQueryKey,
  getGetProductBySlugQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { format } from "date-fns";

function StarRow({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          width={size}
          height={size}
          className={n <= value ? "fill-current text-primary" : "text-muted-foreground/40"}
        />
      ))}
    </div>
  );
}

export function Reviews({ slug }: { slug: string }) {
  const qc = useQueryClient();
  const { data: reviews } = useListProductReviews(slug);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const createReview = useCreateProductReview({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListProductReviewsQueryKey(slug) });
        qc.invalidateQueries({ queryKey: getGetProductBySlugQueryKey(slug) });
        setName("");
        setEmail("");
        setRating(5);
        setTitle("");
        setBody("");
        setOpen(false);
      },
      onError: (e: unknown) => {
        const m = e instanceof Error ? e.message : "Could not submit review.";
        setErr(m);
      },
    },
  });

  const canSubmit =
    name.trim().length > 1 && body.trim().length > 4 && rating >= 1 && rating <= 5 && !createReview.isPending;

  const submit = () => {
    setErr(null);
    if (!canSubmit) return;
    createReview.mutate({
      slug,
      data: {
        customerName: name.trim(),
        customerEmail: email.trim() || undefined,
        rating,
        title: title.trim() || undefined,
        body: body.trim(),
      },
    });
  };

  return (
    <section className="mt-16">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-2xl font-semibold md:text-3xl">Customer reviews</h2>
        <Button
          variant={open ? "outline" : "default"}
          onClick={() => setOpen((v) => !v)}
          data-testid="button-toggle-review"
        >
          {open ? "Cancel" : "Write a review"}
        </Button>
      </div>

      {open ? (
        <div className="mt-5 rounded-2xl border border-card-border bg-card p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Your name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" data-testid="input-review-name" />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Email (optional)</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div className="mt-3">
            <Label className="text-xs font-medium text-muted-foreground">Rating</Label>
            <div className="mt-1 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className="rounded-md p-1 hover-elevate"
                  aria-label={`${n} stars`}
                  data-testid={`button-rate-${n}`}
                >
                  <Star
                    className={n <= rating ? "h-6 w-6 fill-current text-primary" : "h-6 w-6 text-muted-foreground/40"}
                  />
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3">
            <Label className="text-xs font-medium text-muted-foreground">Title (optional)</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sticks great on my laptop" className="mt-1" />
          </div>
          <div className="mt-3">
            <Label className="text-xs font-medium text-muted-foreground">Your review *</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className="mt-1" data-testid="input-review-body" />
          </div>
          {err ? (
            <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {err}
            </div>
          ) : null}
          <Button onClick={submit} disabled={!canSubmit} className="mt-4" data-testid="button-submit-review">
            {createReview.isPending ? "Submitting…" : "Submit review"}
          </Button>
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {reviews && reviews.length > 0 ? (
          reviews.map((r) => (
            <div key={r.id} className="rounded-2xl border border-card-border bg-card p-5" data-testid={`review-${r.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{r.customerName}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {format(new Date(r.createdAt), "MMM d, yyyy")}
                  </div>
                </div>
                <StarRow value={r.rating} />
              </div>
              {r.title ? <h3 className="mt-2 font-serif text-lg font-semibold">{r.title}</h3> : null}
              <p className="mt-1 text-sm text-foreground/85 whitespace-pre-line">{r.body}</p>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
            No reviews yet. Be the first to share your experience!
          </div>
        )}
      </div>
    </section>
  );
}
