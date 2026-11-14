"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { CATEGORIES, CATEGORY_LABEL, type Category, type NewRecipe, type Recipe } from "@/lib/types";

interface Props {
  open: boolean;
  /** When set, the form edits this recipe instead of adding a new one. */
  recipe?: Recipe | null;
  onClose: () => void;
  onSubmit: (recipe: NewRecipe, imageFile: File | null) => Promise<void>;
}

type Row = { key: string; quantity: string; name: string };
type Step = { key: string; text: string };
type ImageSource = "gallery" | "camera" | "link";

const uid = () => Math.random().toString(36).slice(2, 10);
const emptyRow = (): Row => ({ key: uid(), quantity: "", name: "" });
const emptyStep = (): Step => ({ key: uid(), text: "" });

const MAX_UPLOAD_MB = 12;
const AUTHOR_KEY = "recipe-book:author-name";

function rememberedAuthor(): string {
  try {
    return window.localStorage.getItem(AUTHOR_KEY) ?? "";
  } catch {
    return "";
  }
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="card-label">
        {label}
        {hint && <span className="ms-2 font-normal text-ink-faint">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

/**
 * The "recipe card": a lined index card that slides onto the table.
 * Used both to add a recipe and to edit one you uploaded.
 */
export function RecipeFormModal({ open, recipe, onClose, onSubmit }: Props) {
  const editing = !!recipe;
  const titleId = useId();
  const firstInput = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState<Category>("Mains");
  const [description, setDescription] = useState("");
  const [prepTime, setPrepTime] = useState("15");
  const [cookTime, setCookTime] = useState("30");
  const [servings, setServings] = useState("4");
  const [imageSource, setImageSource] = useState<ImageSource>("gallery");
  const [imageLink, setImageLink] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  /** The photo already saved on the recipe being edited (kept unless replaced or removed). */
  const [existingImage, setExistingImage] = useState<string | undefined>();
  const [preview, setPreview] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<Row[]>(() => [emptyRow(), emptyRow()]);
  const [steps, setSteps] = useState<Step[]>(() => [emptyStep()]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fill the card every time it opens: blank for a new recipe, or the recipe's data.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setImageFile(null);
    setImageLink("");
    setImageSource("gallery");
    if (recipe) {
      setTitle(recipe.title);
      setAuthor(recipe.author);
      setCategory(recipe.category);
      setDescription(recipe.description ?? "");
      setPrepTime(String(recipe.prepTime));
      setCookTime(String(recipe.cookTime));
      setServings(String(recipe.servings));
      setExistingImage(recipe.imageUrl);
      setIngredients(
        recipe.ingredients.length
          ? recipe.ingredients.map((i) => ({ key: uid(), ...i }))
          : [emptyRow()],
      );
      setSteps(recipe.steps.length ? recipe.steps.map((text) => ({ key: uid(), text })) : [emptyStep()]);
      setNotes(recipe.chefsNotes ?? "");
    } else {
      setTitle("");
      setAuthor(rememberedAuthor());
      setCategory("Mains");
      setDescription("");
      setPrepTime("15");
      setCookTime("30");
      setServings("4");
      setExistingImage(undefined);
      setIngredients([emptyRow(), emptyRow()]);
      setSteps([emptyStep()]);
      setNotes("");
    }
  }, [open, recipe]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => firstInput.current?.focus(), 300);
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

  const pickFile = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return setError("אפשר להעלות רק קובץ תמונה.");
    if (f.size > MAX_UPLOAD_MB * 1024 * 1024) {
      return setError(`התמונה גדולה מדי. בחרו תמונה עד ${MAX_UPLOAD_MB} MB.`);
    }
    setError(null);
    setImageFile(f);
    setImageLink("");
  };

  const link = imageLink.trim();
  // Priority: a newly picked photo, then a pasted link, then the photo the recipe already had.
  const shownImage = preview ?? (link || existingImage || null);

  const clearImage = () => {
    setImageFile(null);
    setImageLink("");
    setExistingImage(undefined);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanIngredients = ingredients
      .filter((r) => r.name.trim())
      .map((r) => ({ quantity: r.quantity.trim(), name: r.name.trim() }));
    const cleanSteps = steps.map((s) => s.text.trim()).filter(Boolean);

    if (!title.trim()) return setError("למתכון חייב להיות שם.");
    if (!author.trim()) return setError("כתבו את השם שלכם, כדי שידעו מי העלה את המתכון.");
    if (!cleanIngredients.length) return setError("הוסיפו לפחות מצרך אחד.");
    if (!cleanSteps.length) return setError("הוסיפו לפחות שלב אחד באופן ההכנה.");
    if (!imageFile && link && !/^https?:\/\//i.test(link)) {
      return setError("קישור לתמונה צריך להתחיל ב-http:// או https://");
    }

    setSaving(true);
    setError(null);
    try {
      try {
        window.localStorage.setItem(AUTHOR_KEY, author.trim());
      } catch {
        /* storage unavailable: not important */
      }
      await onSubmit(
        {
          title: title.trim(),
          author: author.trim(),
          category,
          description: description.trim() || undefined,
          prepTime: Math.max(0, Number(prepTime) || 0),
          cookTime: Math.max(0, Number(cookTime) || 0),
          servings: Math.max(1, Number(servings) || 1),
          imageUrl: imageFile ? undefined : link || existingImage || undefined,
          ingredients: cleanIngredients,
          steps: cleanSteps,
          chefsNotes: notes.trim() || undefined,
        },
        imageFile,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "משהו השתבש בשמירת המתכון.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/55 backdrop-blur-md"
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
              initial={{ y: 60, rotate: 3, opacity: 0 }}
              animate={{ y: 0, rotate: 0.6, opacity: 1 }}
              exit={{ y: 40, rotate: -2, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
            >
              <header className="recipe-card__header flex items-start justify-between gap-4 px-6 pb-3 pt-6 sm:px-10">
                <div>
                  <p className="font-sans text-xs font-bold text-leather">
                    {editing ? "עריכת מתכון ✏️" : "מהמטבח של טורפים את המטבח 🌶️🔥"}
                  </p>
                  <h2 id={titleId} className="font-serif text-3xl font-bold text-ink">
                    {editing ? recipe!.title : "מתכון חדש"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  aria-label="סגירה"
                  className="mt-1 rounded-full p-1.5 text-ink-faint transition hover:bg-ink/5 hover:text-ink"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </header>

              <div className="recipe-card__body space-y-5 px-6 pb-6 pt-2 sm:px-10">
                <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                  <Field label="שם המתכון">
                    <input
                      ref={firstInput}
                      className="card-input font-serif text-xl"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="למשל: פלפלים ממולאים של סבתא"
                      maxLength={120}
                      required
                    />
                  </Field>
                  <Field label="פרק">
                    <select
                      className="card-input"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as Category)}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {CATEGORY_LABEL[c]}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="השם שלך" hint="יופיע כ״הועלה על ידי״">
                    <input
                      className="card-input"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      placeholder="איך קוראים לך?"
                      maxLength={80}
                      required
                    />
                  </Field>
                  <Field label="במשפט אחד" hint="לא חובה">
                    <input
                      className="card-input"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="חריף, עסיסי, נעלם תוך דקות"
                      maxLength={140}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <Field label="הכנה" hint="דקות">
                    <input className="card-input" type="number" inputMode="numeric" min={0} value={prepTime} onChange={(e) => setPrepTime(e.target.value)} />
                  </Field>
                  <Field label="בישול" hint="דקות">
                    <input className="card-input" type="number" inputMode="numeric" min={0} value={cookTime} onChange={(e) => setCookTime(e.target.value)} />
                  </Field>
                  <Field label="מנות">
                    <input className="card-input" type="number" inputMode="numeric" min={1} value={servings} onChange={(e) => setServings(e.target.value)} />
                  </Field>
                </div>

                {/* Photo */}
                <fieldset>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <legend className="card-label">תמונה של המנה</legend>
                    <div className="flex rounded-full border border-ink-faint/40 p-0.5 font-sans text-xs" role="tablist">
                      {(
                        [
                          ["gallery", "🖼️ מהגלריה"],
                          ["camera", "📷 צילום"],
                          ["link", "🔗 קישור"],
                        ] as const
                      ).map(([m, label]) => (
                        <button
                          key={m}
                          type="button"
                          role="tab"
                          aria-selected={imageSource === m}
                          onClick={() => setImageSource(m)}
                          className={`rounded-full px-3 py-1 transition ${
                            imageSource === m ? "bg-leather text-paper" : "text-ink-soft hover:text-ink"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-4">
                    <div className="photo-frame relative flex h-24 w-28 shrink-0 items-center justify-center overflow-hidden bg-paper-dark">
                      {shownImage ? (
                        <img src={shownImage} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="font-hand text-2xl font-bold text-ink-faint">תמונה</span>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      {imageSource === "link" ? (
                        <input
                          className="card-input"
                          type="url"
                          dir="ltr"
                          value={imageLink}
                          onChange={(e) => {
                            setImageLink(e.target.value);
                            if (e.target.value) setImageFile(null);
                          }}
                          placeholder="https://…/my-dish.jpg"
                        />
                      ) : (
                        <label className="flex w-full cursor-pointer items-center justify-center rounded border-2 border-dashed border-ink-faint/40 px-4 py-4 text-center font-sans text-sm text-ink-soft transition hover:border-leather/60 hover:text-ink">
                          <input
                            // Re-mount per source so the right picker opens.
                            key={imageSource}
                            type="file"
                            accept="image/*"
                            // No capture → phones offer the photo gallery; capture → camera.
                            {...(imageSource === "camera" ? { capture: "environment" as const } : {})}
                            className="sr-only"
                            onChange={(e) => {
                              pickFile(e.target.files?.[0] ?? null);
                              e.target.value = "";
                            }}
                          />
                          {imageFile
                            ? `✔ ${imageFile.name}`
                            : imageSource === "camera"
                              ? "צלמו את המנה עכשיו"
                              : "בחרו תמונה מהגלריה של המכשיר"}
                        </label>
                      )}
                      {shownImage && (
                        <button
                          type="button"
                          onClick={clearImage}
                          className="self-start font-sans text-xs text-leather underline-offset-2 hover:underline"
                        >
                          הסרת התמונה
                        </button>
                      )}
                    </div>
                  </div>
                </fieldset>

                {/* Ingredients */}
                <fieldset>
                  <legend className="card-label">מצרכים</legend>
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
                            placeholder="2 כוסות"
                            aria-label={`כמות למצרך ${i + 1}`}
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
                            placeholder="קמח לבן"
                            aria-label={`מצרך ${i + 1}`}
                          />
                          <RemoveButton
                            label={`הסרת מצרך ${i + 1}`}
                            disabled={ingredients.length === 1}
                            onClick={() => setIngredients((rs) => rs.filter((r) => r.key !== row.key))}
                          />
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                  <AddButton onClick={() => setIngredients((rs) => [...rs, emptyRow()])}>הוספת מצרך</AddButton>
                </fieldset>

                {/* Steps */}
                <fieldset>
                  <legend className="card-label">אופן ההכנה</legend>
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
                          <span className="mt-2 w-6 shrink-0 text-start font-serif text-xl font-bold text-leather">
                            {i + 1}
                          </span>
                          <textarea
                            className="card-input min-h-[2.75rem] resize-y"
                            rows={2}
                            value={step.text}
                            onChange={(e) =>
                              setSteps((ss) => ss.map((s) => (s.key === step.key ? { ...s, text: e.target.value } : s)))
                            }
                            placeholder={i === 0 ? "מחממים תנור ל-180 מעלות…" : "ואז…"}
                            aria-label={`שלב ${i + 1}`}
                          />
                          <RemoveButton
                            label={`הסרת שלב ${i + 1}`}
                            disabled={steps.length === 1}
                            onClick={() => setSteps((ss) => ss.filter((s) => s.key !== step.key))}
                          />
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ol>
                  <AddButton onClick={() => setSteps((ss) => [...ss, emptyStep()])}>הוספת שלב</AddButton>
                </fieldset>

                <Field label="טיפ מהשף" hint="לא חובה">
                  <textarea
                    className="card-input font-hand text-2xl font-bold leading-tight"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="טריקים, תחליפים, הסוד של המנה…"
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
                    ביטול
                  </button>
                  <motion.button
                    type="submit"
                    disabled={saving}
                    whileTap={{ scale: 0.97 }}
                    className="btn-leather rounded-full px-6 py-2.5 font-sans text-sm font-bold"
                  >
                    {saving ? "כורכים את זה לספר…" : editing ? "שמירת השינויים" : "הוספה לספר 🔥"}
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
      className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-sans text-sm font-semibold text-leather transition hover:bg-leather/10"
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
