import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Check, Clock, ExternalLink, Upload } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { useContent, slugify } from "@/lib/content";
import { supabase } from "@/lib/supabase";
import {
  LISTING_CATEGORIES,
  LISTING_CONDITIONS,
  LISTING_DURATION_DAYS,
  LISTING_FEE,
  formatPrice,
} from "@/lib/data";
import type { Listing } from "@/lib/data";
import { usePageMeta } from "@/lib/seo";
import campusBoardUpiQr from "@/assets/campusboard-upi-qr.png";

import { Card } from "@/components/ui/card";

const MAX_IMAGE_FILES = 6;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

// Replace with the real UPI ID this platform collects payments on.
const UPI_ID = "amsykedia-1@oksbi";
const PAYEE_NAME = "CampusBoard";
const UPI_URI = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${LISTING_FEE}&cu=INR&tn=${encodeURIComponent("CampusBoard Buy & Sell listing fee")}`;

/** Uploads under {uid}/{listingId}/... so storage RLS can verify ownership from the path. */
async function uploadToBucket(bucket: string, userId: string, listingId: string, file: File) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120) || "upload";
  const path = `${userId}/${listingId}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

type Step = "details" | "payment" | "screenshot" | "done";

const fieldClass =
  "mt-1 min-h-11 w-full rounded-xl border border-input bg-card px-4 text-sm outline-none transition-colors focus:ring-2 focus:ring-primary/20 focus:border-primary";

export default function BuySellNew() {
  usePageMeta(
    "Post a listing — CampusBoard",
    "Post a Buy & Sell listing for ₹20 / 30 days, pending Admin approval.",
  );

  const { user } = useAuth();
  const {
    addListing,
    markPaymentCompleted,
    submitPaymentScreenshot,
    listings,
    loading: contentLoading,
  } = useContent();
  const [searchParams] = useSearchParams();
  const resumeListingId = searchParams.get("listingId");

  const [step, setStep] = useState<Step>("details");
  const [listingId, setListingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [listingType, setListingType] = useState<Listing["listingType"]>("Sell");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Listing["category"]>("Books");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState<Listing["condition"]>("Good Condition");
  const [sellerName, setSellerName] = useState(user?.name ?? "");
  const [sellerPhone, setSellerPhone] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!resumeListingId || contentLoading || !user || step === "done") return;
    const existing = listings.find((listing) => listing.id === resumeListingId);
    if (!existing || existing.ownerId !== user.id) {
      setError("That listing could not be found in your account.");
      return;
    }
    setListingId(existing.id);
    if (existing.status === "payment_pending") {
      setStep("payment");
    } else if (existing.status === "payment_submitted") {
      setStep("screenshot");
    } else {
      setError("This listing is no longer waiting for payment.");
    }
  }, [resumeListingId, contentLoading, listings, user, step]);

  if (!user) {
    return (
      <div className="mx-auto max-w-md py-8">
        <Card className="p-6 sm:p-8 text-center border-border/70 shadow-sm">
          <h1 className="text-2xl font-display font-extrabold tracking-tight">
            Login to post a listing
          </h1>
          <p className="pt-2 text-sm text-muted-foreground">
            Sign in with your college email to post on the Buy & Sell marketplace.
          </p>
          <Link
            to={`/login?redirect=${encodeURIComponent("/buy-sell/new")}&action=${encodeURIComponent("Post a listing")}`}
            className="mt-6 inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            Go to login
          </Link>
        </Card>
      </div>
    );
  }

  const handleDetailsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const priceNum = Number(price);
    if (
      !title.trim() ||
      !description.trim() ||
      !sellerName.trim() ||
      !sellerPhone.trim() ||
      !Number.isFinite(priceNum) ||
      priceNum <= 0 ||
      priceNum > 10000000
    ) {
      setError("Fill in every field with a valid price (up to ₹1 crore) before continuing.");
      return;
    }
    if (imageFiles.length > MAX_IMAGE_FILES) {
      setError(`Choose at most ${MAX_IMAGE_FILES} photos.`);
      return;
    }
    for (const file of imageFiles) {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        setError("Photos must be JPEG, PNG, WebP or GIF images.");
        return;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        setError("Each photo must be 5 MB or smaller.");
        return;
      }
    }
    setError(null);
    setSubmitting(true);
    let uploadedImages: string[] = [];
    try {
      const id = `${slugify(title)}-${Date.now().toString(36)}`;
      uploadedImages = await Promise.all(
        imageFiles.map((file) => uploadToBucket("listing-images", user.id, id, file)),
      );
      await addListing({
        id,
        listingType,
        title: title.trim(),
        price: priceNum,
        condition,
        category,
        description: description.trim(),
        sellerName: sellerName.trim(),
        sellerPhone: sellerPhone.trim(),
        images: uploadedImages,
      });
      setListingId(id);
      setStep("payment");
    } catch (err) {
      if (uploadedImages.length > 0)
        supabase.storage
          .from("listing-images")
          .remove(uploadedImages)
          .catch(() => {});
      setError(err instanceof Error ? err.message : "Could not create the listing.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentDone = async () => {
    if (!listingId) return;
    setError(null);
    try {
      await markPaymentCompleted(listingId);
      setStep("screenshot");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the payment status.");
    }
  };

  const handleScreenshotSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!listingId || !screenshotFile) {
      setError("Upload your payment screenshot to continue.");
      return;
    }
    setError(null);
    if (!ALLOWED_IMAGE_TYPES.has(screenshotFile.type)) {
      setError("Payment screenshot must be a JPEG, PNG, WebP or GIF image.");
      return;
    }
    if (screenshotFile.size > MAX_IMAGE_SIZE) {
      setError("Payment screenshot must be 5 MB or smaller.");
      return;
    }
    setSubmitting(true);
    let uploadedPath: string | null = null;
    try {
      uploadedPath = await uploadToBucket(
        "payment-screenshots",
        user.id,
        listingId,
        screenshotFile,
      );
      await submitPaymentScreenshot(listingId, uploadedPath);
      setStep("done");
    } catch (err) {
      if (uploadedPath)
        supabase.storage
          .from("payment-screenshots")
          .remove([uploadedPath])
          .catch(() => {});
      setError(err instanceof Error ? err.message : "Could not submit the screenshot.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-xl space-y-6 py-4">
      <Card className="p-6 sm:p-8 border-border/70 shadow-sm">
        <p className="text-xs font-bold tracking-widest text-primary uppercase">Buy & Sell</p>
        <h1 className="pt-2 text-3xl font-display font-extrabold tracking-tight sm:text-4xl text-foreground">
          Post an item
        </h1>
        <p className="pt-2 text-sm text-muted-foreground">
          Listings cost {formatPrice(LISTING_FEE)} and stay live for {LISTING_DURATION_DAYS} days
          once Admin approves your payment.
        </p>
      </Card>

      {step === "details" ? (
        <Card className="p-6 sm:p-8 border-border/70 shadow-sm">
          <form className="space-y-4" onSubmit={handleDetailsSubmit}>
            <div>
              <span className="text-sm font-bold">Listing type</span>
              <div className="mt-1 flex gap-2">
                {(["Sell", "Buy"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setListingType(t)}
                    aria-pressed={listingType === t}
                    className={
                      listingType === t
                        ? "inline-flex min-h-9 items-center rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground shadow-sm"
                        : "inline-flex min-h-9 items-center rounded-lg border border-border bg-card px-4 text-xs font-semibold text-muted-foreground hover:bg-accent"
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="title" className="text-sm font-bold">
                Title
              </label>
              <input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={fieldClass}
                placeholder="e.g. Engineering Mathematics Book"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="category" className="text-sm font-bold">
                  Category
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Listing["category"])}
                  className={fieldClass}
                >
                  {LISTING_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="condition" className="text-sm font-bold">
                  Condition
                </label>
                <select
                  id="condition"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as Listing["condition"])}
                  className={fieldClass}
                >
                  {LISTING_CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="description" className="text-sm font-bold">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={fieldClass + " min-h-24 py-2"}
              />
            </div>

            <div>
              <label htmlFor="price" className="text-sm font-bold">
                Price (₹)
              </label>
              <input
                id="price"
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="sellerName" className="text-sm font-bold">
                  Your name
                </label>
                <input
                  id="sellerName"
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor="sellerPhone" className="text-sm font-bold">
                  Phone number
                </label>
                <input
                  id="sellerPhone"
                  value={sellerPhone}
                  onChange={(e) => setSellerPhone(e.target.value)}
                  className={fieldClass}
                  placeholder="98XXXXXX21"
                />
              </div>
            </div>

            <div>
              <span className="text-sm font-bold">Photos (optional)</span>
              <label
                htmlFor="images"
                className="mt-1 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-input bg-card px-4 text-sm font-semibold text-muted-foreground hover:bg-accent"
              >
                <Upload className="size-4" aria-hidden="true" />
                {imageFiles.length > 0 ? `${imageFiles.length} photo(s) selected` : "Upload photos"}
              </label>
              <input
                id="images"
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => setImageFiles(Array.from(e.target.files ?? []))}
              />
            </div>

            {error ? (
              <p role="alert" className="text-sm font-semibold text-destructive">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="min-h-11 w-full rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.99] disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Continue to payment"}
            </button>
          </form>
        </Card>
      ) : null}

      {step === "payment" ? (
        <Card className="min-w-0 space-y-5 p-6 text-center sm:p-8 border-border/70 shadow-sm">
          <h2 className="break-words text-2xl font-display font-extrabold tracking-tight">
            Pay {formatPrice(LISTING_FEE)} for 30 days
          </h2>
          <p className="text-sm text-muted-foreground">
            Scan the QR code below with any UPI app and pay {formatPrice(LISTING_FEE)}. Your listing
            goes live for {LISTING_DURATION_DAYS} days once Admin verifies the payment.
          </p>
          <img
            src={campusBoardUpiQr}
            alt="UPI QR code to pay ₹20 to CampusBoard"
            width={240}
            height={240}
            className="mx-auto size-52 max-w-full rounded-2xl border border-border bg-white p-2 sm:size-60 shadow-inner"
          />
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">UPI ID</p>
            <p className="break-all text-sm font-extrabold text-foreground">{UPI_ID}</p>
          </div>
          <div className="flex flex-col justify-center gap-2 sm:flex-row">
            <a
              href={UPI_URI}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-secondary px-5 text-sm font-bold text-secondary-foreground transition hover:bg-secondary/80 active:scale-[0.98]"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              Open UPI app
            </a>
            <button
              type="button"
              onClick={handlePaymentDone}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98]"
            >
              <Check className="size-4" aria-hidden="true" />
              I’ve paid
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            After paying, continue to upload your payment screenshot for Admin verification.
          </p>
        </Card>
      ) : null}

      {step === "screenshot" ? (
        <Card className="space-y-4 p-6 sm:p-8 text-center border-border/70 shadow-sm">
          <form className="space-y-4" onSubmit={handleScreenshotSubmit}>
            <h2 className="text-2xl font-display font-extrabold tracking-tight">
              Upload payment screenshot
            </h2>
            <p className="text-sm text-muted-foreground">
              Admin verifies your payment from this screenshot before approving the listing.
            </p>
            <label
              htmlFor="screenshot"
              className="mx-auto flex min-h-11 max-w-xs cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-input bg-card px-4 text-sm font-semibold text-muted-foreground hover:bg-accent"
            >
              <Upload className="size-4" aria-hidden="true" />
              {screenshotFile ? "Screenshot selected" : "Upload screenshot"}
            </label>
            <input
              id="screenshot"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setScreenshotFile(file);
                  setScreenshotPreview((prev) => {
                    if (prev) URL.revokeObjectURL(prev);
                    return URL.createObjectURL(file);
                  });
                }
              }}
            />
            {screenshotPreview ? (
              <img
                src={screenshotPreview}
                alt="Payment screenshot preview"
                className="mx-auto max-h-48 rounded-xl border border-border object-contain"
              />
            ) : null}

            {error ? (
              <p role="alert" className="text-sm font-semibold text-destructive">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="mx-auto inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-6 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit for approval"}
            </button>
          </form>
        </Card>
      ) : null}

      {step === "done" ? (
        <Card className="space-y-3 p-6 sm:p-8 text-center border-border/70 shadow-sm">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
            <Clock className="size-6" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-display font-extrabold tracking-tight">
            Payment submitted — waiting for Admin approval
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Admin verifies your payment and publishes the listing. You'll see it in the marketplace
            once it's approved.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <Link
              to="/buy-sell"
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              Back to marketplace
            </Link>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
