"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { CATEGORIES, type Category, type NewRecipe } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (recipe: NewRecipe, imageFile: File | null) => Promise<void>;
}

type Row = { key: string; quantity: string; name: string };
type Step = { key: string; text: string };

const uid = () => Math.random().toString(36).slice(2, 10);
const emptyRow = (): Row => ({ key: uid(), quantity: "", name: "" });
const emptyStep = (): Step => ({ key: uid(), text: "" });

const MAX_UPLOAD_MB = 8;

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="card-label">
        {label}
        {hint && <span className="ml-2 normal-case tracking-normal text-ink-faint">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

/**
 * The "recipe card": a lined index card that slides onto the table.
 */
export function AddRecipeModal({ open, onClose, onSubmit }: Props) {
  const titleId = useId();
  const firstInput = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState<Category>("Mains");
  const [description, setDescription] = useState("");
  const [prepTime, setPrepTime] = useState("15");
  const [cookTime, setCookTime] = useState("30");
  const [servings, setServings] = useState("4");
  const [imageMode, setImageMode] = useState<"url" | "upload">("url");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<Row[]>(() => [emptyRow(), emptyRow()]);
  const [steps, setSteps] = useState<Step[]>(() => [emptyStep()]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => firstInput.current?.focus(), 250);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !saving && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, saving]);

  // Object URLs for local previews must be released.
  useEffect(() => {
    if (!imageFile) return setPreview(null);
    const url = URL.createObjectURL(imageFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const reset = () => {
    setTitle("");
    setAuthor("");
    setCategory("Mains");
    setDescription("");
    setPrepTime("15");
    setCookTime("30");
    setServings("4");
    setImageUrl("");
    setImageFile(null);
    setIngredients([emptyRow(), emptyRow()]);
    setSteps([emptyStep()]);
    setNotes("");
    setError(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanIngredients = ingredients
      .filter((r) => r.name.trim())
      .map((r) => ({ quantity: r.quantity.trim(), name: r.name.trim() }));
    const cleanSteps = steps.map((s) => s.text.trim()).filter(Boolean);

    if (!title.trim() || !author.trim()) return setError("Every recipe needs a title and an author.");
    if (!cleanIngredients.length) return setError("Add at least one ingredient.");
    if (!cleanSteps.length) return setError("Add at least one step to the method.");
    if (imageMode === "url" && imageUrl && !/^https?:\/\//i.test(imageUrl.trim())) {
      return setError("The image URL should start with http:// or https://");
    }

    setSaving(true);
    setError(null);
    try {
      await onSubmit(
        {
          title: title.trim(),
          author: author.trim(),
          category,
          description: description.trim() || undefined,
          prepTime: Math.max(0, Number(prepTime) || 0),
          cookTime: Math.max(0, Number(cookTime) || 0),
          servings: Math.max(1, Number(servings) || 1),
          imageUrl: imageMode === "url" ? imageUrl.trim() || undefined : undefined,
          ingredients: cleanIngredients,
          steps: cleanSteps,
          chefsNotes: notes.trim() || undefined,
        },
        imageMode === "upload" ? imageFile : null,
      );
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong saving the recipe.");
    } finally {
      setSaving(false);
    }
  };

  const shownImage = imageMode === "upload" ? preview : imageUrl.trim() || null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/55 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* min-h-full + centering: short cards sit mid-screen, tall ones scroll from the top. */}
          <div
            className="flex min-h-full items-center justify-center px-4 py-6 sm:py-10"
            onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}
          >
          <motion.form
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onSubmit={submit}
            className="recipe-card relative w-full max-w-2xl rounded-[6px] shadow-card"
            initial={{ y: 60, rotate: -3, opacity: 0 }}
            animate={{ y: 0, rotate: -0.6, opacity: 1 }}
            exit={{ y: 40, rotate: 2, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
          >
            <header className="recipe-card__header flex items-start justify-between gap-4 px-6 pb-3 pt-6 sm:px-10">
              <div>
                <p className="font-sans text-[10px] font-semibold uppercase tracking-[.35em] text-leather">
                  From the kitchen of
                </p>
                <h2 id={titleId} className="font-serif text-3xl font-semibold italic text-ink">
                  A New Recipe
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                aria-label="Close"
                className="mt-1 rounded-full p-1.5 text-ink-faint transition hover:bg-ink/5 hover:text-ink"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </header>

            <div className="recipe-card__body space-y-5 px-6 pb-6 pt-2 sm:px-10">
              <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                <Field label="Title">
                  <input
                    ref={firstInput}
                    className="card-input font-serif text-xl"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Grandma's apple crumble"
                    maxLength={120}
                    required
                  />
                </Field>
                <Field label="Section">
                  <select
                    className="card-input"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Author">
                  <input
                    className="card-input"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Your name"
                    maxLength={80}
                    required
                  />
                </Field>
                <Field label="In a sentence" hint="optional">
                  <input
                    className="card-input"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Warm, crumbly, best with cream"
                    maxLength={140}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Field label="Prep" hint="min">
                  <input className="card-input" type="number" min={0} value={prepTime} onChange={(e) => setPrepTime(e.target.value)} />
                </Field>
                <Field label="Cook" hint="min">
                  <input className="card-input" type="number" min={0} value={cookTime} onChange={(e) => setCookTime(e.target.value)} />
                </Field>
                <Field label="Serves">
                  <input className="card-input" type="number" min={1} value={servings} onChange={(e) => setServings(e.target.value)} />
                </Field>
              </div>

              {/* Photo */}
              <fieldset>
                <div className="flex items-center justify-between">
                  <legend className="card-label">Photo</legend>
                  <div className="flex rounded-full border border-ink-faint/40 p-0.5 font-sans text-xs">
                    {(["url", "upload"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setImageMode(m)}
                        className={`rounded-full px-3 py-1 transition ${
                          imageMode === m ? "bg-leather text-paper" : "text-ink-soft hover:text-ink"
                        }`}
                      >
                        {m === "url" ? "Paste a link" : "Upload"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-4">
                  <div className="photo-frame flex h-20 w-24 shrink-0 items-center justify-center overflow-hidden bg-paper-dark">
                    {shownImage ? (
                      <img src={shownImage} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-hand text-lg text-ink-faint">photo</span>
                    )}
                  </div>
                  {imageMode === "url" ? (
                    <input
                      className="card-input"
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://…/my-dish.jpg"
                    />
                  ) : (
                    <label className="flex w-full cursor-pointer items-center justify-center rounded border-2 border-dashed border-ink-faint/40 px-4 py-5 text-center font-sans text-sm text-ink-soft transition hover:border-leather/60 hover:text-ink">
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          if (f && f.size > MAX_UPLOAD_MB * 1024 * 1024) {
                            setError(`Please choose a photo under ${MAX_UPLOAD_MB} MB.`);
                            return;
                          }
                          setImageFile(f);
                        }}
                      />
                      {imageFile ? imageFile.name : "Choose a photo from your device"}
                    </label>
                  )}
                </div>
              </fieldset>

              {/* Ingredients */}
              <fieldset>
                <legend className="card-label">Ingredients</legend>
                <ul className="mt-1 space-y-1.5">
                  <AnimatePresence initial={false}>
                    {ingredients.map((row, i) => (
                      <motion.li
                        key={row.key}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-2"
                      >
                        <input
                          className="card-input w-28 shrink-0"
                          value={row.quantity}
                          onChange={(e) =>
                            setIngredients((rs) => rs.map((r) => (r.key === row.key ? { ...r, quantity: e.target.value } : r)))
                          }
                          placeholder="2 cups"
                          aria-label={`Ingredient ${i + 1} quantity`}
                        />
                        <input
                          className="card-input"
                          value={row.name}
                          onChange={(e) =>
                            setIngredients((rs) => rs.map((r) => (r.key === row.key ? { ...r, name: e.target.value } : r)))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              setIngredients((rs) => [...rs, emptyRow()]);
                            }
                          }}
                          placeholder="plain flour"
                          aria-label={`Ingredient ${i + 1}`}
                        />
                        <RemoveButton
                          label={`Remove ingredient ${i + 1}`}
                          disabled={ingredients.length === 1}
                          onClick={() => setIngredients((rs) => rs.filter((r) => r.key !== row.key))}
                        />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
                <AddButton onClick={() => setIngredients((rs) => [...rs, emptyRow()])}>Add ingredient</AddButton>
              </fieldset>

              {/* Steps */}
              <fieldset>
                <legend className="card-label">Method</legend>
                <ol className="mt-1 space-y-2">
                  <AnimatePresence initial={false}>
                    {steps.map((step, i) => (
                      <motion.li
                        key={step.key}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-start gap-3"
                      >
                        <span className="mt-2 w-6 shrink-0 text-right font-serif text-xl font-semibold text-leather">
                          {i + 1}
                        </span>
                        <textarea
                          className="card-input min-h-[2.75rem] resize-y"
                          rows={2}
                          value={step.text}
                          onChange={(e) =>
                            setSteps((ss) => ss.map((s) => (s.key === step.key ? { ...s, text: e.target.value } : s)))
                          }
                          placeholder={i === 0 ? "Heat the oven to 180 °C…" : "And then…"}
                          aria-label={`Step ${i + 1}`}
                        />
                        <RemoveButton
                          label={`Remove step ${i + 1}`}
                          disabled={steps.length === 1}
                          onClick={() => setSteps((ss) => ss.filter((s) => s.key !== step.key))}
                        />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ol>
                <AddButton onClick={() => setSteps((ss) => [...ss, emptyStep()])}>Add step</AddButton>
              </fieldset>

              <Field label="Chef's notes" hint="optional">
                <textarea
                  className="card-input font-hand text-xl leading-tight"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Tips, swaps, the secret ingredient…"
                />
              </Field>

              <AnimatePresence>
                {error && (
                  <motion.p
                    role="alert"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="rounded border border-leather/30 bg-leather/10 px-3 py-2 font-sans text-sm text-leather"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="rounded-full px-4 py-2 font-sans text-sm text-ink-soft transition hover:text-ink"
                >
                  Cancel
                </button>
                <motion.button
                  type="submit"
                  disabled={saving}
                  whileTap={{ scale: 0.97 }}
                  className="btn-leather rounded-full px-6 py-2.5 font-sans text-sm font-semibold tracking-wide"
                >
                  {saving ? "Binding it into the book…" : "Add to the book"}
                </motion.button>
              </div>
            </div>
          </motion.form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-sans text-sm font-medium text-leather transition hover:bg-leather/10"
    >
      <span aria-hidden className="text-lg leading-none">+</span>
      {children}
    </button>
  );
}

function RemoveButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="shrink-0 rounded-full p-1.5 text-ink-faint transition hover:bg-leather/10 hover:text-leather disabled:invisible"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </button>
  );
}
