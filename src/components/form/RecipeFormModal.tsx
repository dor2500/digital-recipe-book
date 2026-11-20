"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  CATEGORIES,
  CATEGORY_LABEL,
  MAX_PHOTOS,
  type Category,
  type NewRecipe,
  type PhotoInput,
  type Recipe,
} from "@/lib/types";
import {
  SECTION_PROFILE,
  UNIT_LABEL,
  UNIT_MINUTES,
  bestUnit,
  parseDuration,
  type TimeField,
  type TimeUnit,
} from "@/lib/sectionProfiles";

interface Props {
  open: boolean;
  /** When set, the form edits this recipe instead of adding a new one. */
  recipe?: Recipe | null;
  onClose: () => void;
  onSubmit: (recipe: NewRecipe, photos: PhotoInput[]) => Promise<void>;
}

type Row = { key: string; quantity: string; name: string };
type Step = { key: string; text: string };
/** A photo on the card: a saved/pasted URL, or a new file shown through an object URL. */
type Photo = { key: string; url: string; file?: File };

type TimeValue = { value: string; unit: TimeUnit };
type Times = Record<TimeField, TimeValue>;
const TIME_FIELDS: TimeField[] = ["prepTime", "restTime", "cookTime"];

/** Starting times for a new recipe in this section. */
function initialTimes(category: Category): Times {
  const t = {} as Times;
  for (const field of TIME_FIELDS) {
    const spec = SECTION_PROFILE[category].times.find((s) => s.field === field);
    t[field] = spec ? { value: String(spec.initial), unit: spec.unit } : { value: "", unit: "min" };
  }
  return t;
}

/** A saved recipe's times, each shown in the unit it reads best in. */
function recipeTimes(recipe: Recipe): Times {
  const t = {} as Times;
  for (const field of TIME_FIELDS) {
    const minutes = recipe[field] ?? 0;
    const spec = SECTION_PROFILE[recipe.category].times.find((s) => s.field === field);
    const unit = bestUnit(minutes, spec?.unit ?? "min");
    t[field] = { value: minutes ? String(minutes / UNIT_MINUTES[unit]) : "", unit };
  }
  return t;
}

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
  const [times, setTimes] = useState<Times>(() => initialTimes("Mains"));
  const [servings, setServings] = useState("4");
  /** Once the cook typed a time or yield, switching section keeps their numbers. */
  const timesTouched = useRef(false);
  /** Photos in display order; the first is the main photo. */
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [linkOpen, setLinkOpen] = useState(false);
  const [imageLink, setImageLink] = useState("");
  /** Object URLs made for file previews, released when the card closes. */
  const objectUrls = useRef<string[]>([]);
  const [ingredients, setIngredients] = useState<Row[]>(() => [emptyRow(), emptyRow()]);
  const [steps, setSteps] = useState<Step[]>(() => [emptyStep()]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fill the card every time it opens: blank for a new recipe, or the recipe's data.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setImageLink("");
    setLinkOpen(false);
    setPhotos(recipe ? recipe.images.map((url) => ({ key: uid(), url })) : []);
    timesTouched.current = !!recipe;
    if (recipe) {
      setTitle(recipe.title);
      setAuthor(recipe.author);
      setCategory(recipe.category);
      setDescription(recipe.description ?? "");
      setTimes(recipeTimes(recipe));
      setServings(String(recipe.servings));
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
      setTimes(initialTimes("Mains"));
      setServings(String(SECTION_PROFILE.Mains.yieldInitial));
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

  // Release file previews when the card closes.
  useEffect(() => {
    if (open) return;
    objectUrls.current.forEach((u) => URL.revokeObjectURL(u));
    objectUrls.current = [];
  }, [open]);

  const roomLeft = MAX_PHOTOS - photos.length;

  const addFiles = (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    const maxBytes = MAX_UPLOAD_MB * 1024 * 1024;
    const images = files.filter((f) => f.type.startsWith("image/"));
    const small = images.filter((f) => f.size <= maxBytes);
    const ok = small.slice(0, Math.max(0, roomLeft));
    const added = ok.map((file) => {
      const url = URL.createObjectURL(file);
      objectUrls.current.push(url);
      return { key: uid(), url, file };
    });
    setPhotos((ps) => [...ps, ...added]);
    if (images.length < files.length) setError("חלק מהקבצים לא היו תמונות ולא נוספו.");
    else if (small.length < images.length) setError(`תמונה גדולה מ-${MAX_UPLOAD_MB} MB לא נוספה.`);
    else if (ok.length < small.length) setError(`אפשר עד ${MAX_PHOTOS} תמונות למתכון.`);
    else setError(null);
  };

  const addLink = () => {
    const url = imageLink.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) return setError("קישור לתמונה צריך להתחיל ב-http:// או https://");
    if (roomLeft <= 0) return setError(`אפשר עד ${MAX_PHOTOS} תמונות למתכון.`);
    setPhotos((ps) => [...ps, { key: uid(), url }]);
    setImageLink("");
    setLinkOpen(false);
    setError(null);
  };

  const removePhoto = (key: string) => setPhotos((ps) => ps.filter((p) => p.key !== key));
  const makeCover = (key: string) =>
    setPhotos((ps) => [...ps.filter((p) => p.key === key), ...ps.filter((p) => p.key !== key)]);
  const movePhoto = (key: string, by: -1 | 1) =>
    setPhotos((ps) => {
      const i = ps.findIndex((p) => p.key === key);
      const j = i + by;
      if (i < 0 || j < 0 || j >= ps.length) return ps;
      const next = [...ps];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const profile = SECTION_PROFILE[category];

  /** Switching section relabels the times; untouched new recipes also get that section's typical numbers. */
  const changeCategory = (next: Category) => {
    setCategory(next);
    if (!timesTouched.current) {
      setTimes(initialTimes(next));
      setServings(String(SECTION_PROFILE[next].yieldInitial));
      return;
    }
    // Keep the cook's numbers, but give a newly shown empty field this section's unit.
    setTimes((t) => {
      const updated = { ...t };
      for (const spec of SECTION_PROFILE[next].times) {
        if (!Number(t[spec.field].value)) updated[spec.field] = { value: "", unit: spec.unit };
      }
      return updated;
    });
  };

  const setTime = (field: TimeField, patch: Partial<TimeValue>) => {
    timesTouched.current = true;
    setTimes((t) => ({ ...t, [field]: { ...t[field], ...patch } }));
  };

  /** Minutes for a stage this section has; stages it does not have are saved as 0. */
  const toMinutes = (field: TimeField) => {
    if (!profile.times.some((s) => s.field === field)) return 0;
    const { value, unit } = times[field];
    return parseDuration(value, unit) ?? 0;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanIngredients = ingredients
      .filter((r) => r.name.trim())
      .map((r) => ({ quantity: r.quantity.trim(), name: r.name.trim() }));
    const cleanSteps = steps.map((s) => s.text.trim()).filter(Boolean);

    if (!title.trim()) return setError("למתכון חייב להיות שם.");
    if (!author.trim()) return setError("כתבו את השם שלכם, כדי שידעו מי העלה את המתכון.");
    for (const spec of profile.times) {
      if (parseDuration(times[spec.field].value, times[spec.field].unit) === null) {
        return setError(`לא הבנו את זמן ה${spec.label}. כתבו מספר, למשל 1.5, או שעון, למשל 1:30.`);
      }
    }
    if (!/^\d+$/.test(servings.trim()) || Number(servings) < 1) {
      return setError(`כמה ${profile.yieldLabel}? כתבו מספר שלם, למשל 4.`);
    }
    if (!cleanIngredients.length) return setError("הוסיפו לפחות מצרך אחד.");
    if (!cleanSteps.length) return setError("הוסיפו לפחות שלב אחד באופן ההכנה.");

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
          prepTime: toMinutes("prepTime"),
          restTime: toMinutes("restTime"),
          cookTime: toMinutes("cookTime"),
          servings: Math.max(1, Number(servings) || 1),
          ingredients: cleanIngredients,
          steps: cleanSteps,
          chefsNotes: notes.trim() || undefined,
        },
        photos.map((p): PhotoInput => (p.file ? { file: p.file } : { url: p.url })),
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
              // Our own Hebrew messages instead of the browser's English bubbles.
              noValidate
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
                      placeholder={`למשל: ${profile.example.title}`}
                      maxLength={120}
                      required
                    />
                  </Field>
                  <Field label="פרק">
                    <select
                      className="card-input"
                      value={category}
                      onChange={(e) => changeCategory(e.target.value as Category)}
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

                {/* Times and yield: which ones, and what they are called, depend on the section. */}
                <div className={`grid gap-4 ${profile.times.length >= 3 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
                  {profile.times.map((spec) => (
                    <Field key={spec.field} label={spec.label}>
                      <div className="flex gap-1">
                        <input
                          className="card-input min-w-0"
                          type="text"
                          inputMode="decimal"
                          dir="ltr"
                          title="מספר (1.5) או שעון (1:30)"
                          value={times[spec.field].value}
                          onChange={(e) => setTime(spec.field, { value: e.target.value })}
                          aria-label={`${spec.label} (${UNIT_LABEL[times[spec.field].unit]})`}
                        />
                        <select
                          className="card-input w-auto shrink-0 px-1 text-sm"
                          value={times[spec.field].unit}
                          onChange={(e) => setTime(spec.field, { unit: e.target.value as TimeUnit })}
                          aria-label={`יחידת זמן ל${spec.label}`}
                        >
                          {(Object.keys(UNIT_LABEL) as TimeUnit[]).map((u) => (
                            <option key={u} value={u}>
                              {UNIT_LABEL[u]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </Field>
                  ))}
                  <Field label={profile.yieldLabel}>
                    <input
                      className="card-input"
                      type="text"
                      inputMode="numeric"
                      dir="ltr"
                      value={servings}
                      onChange={(e) => {
                        timesTouched.current = true;
                        setServings(e.target.value);
                      }}
                    />
                  </Field>
                </div>

                {/* Photos */}
                <fieldset>
                  <legend className="card-label">
                    תמונות של המנה
                    <span className="ms-2 font-normal text-ink-faint">
                      {photos.length}/{MAX_PHOTOS} · הראשונה היא התמונה הראשית
                    </span>
                  </legend>

                  {photos.length > 0 && (
                    <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                      <AnimatePresence initial={false}>
                        {photos.map((photo, i) => (
                          <motion.li
                            key={photo.key}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className={`photo-frame relative aspect-[4/3] overflow-hidden bg-paper-dark ${
                              i === 0 ? "ring-2 ring-leather ring-offset-2 ring-offset-[#fffcf3]" : ""
                            }`}
                          >
                            <img src={photo.url} alt={`תמונה ${i + 1}`} className="h-full w-full object-cover" />
                            {i === 0 && (
                              <span className="absolute start-1 top-1 rounded bg-leather/90 px-1.5 py-0.5 font-sans text-[10px] font-bold text-paper">
                                ראשית
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => removePhoto(photo.key)}
                              aria-label={`הסרת תמונה ${i + 1}`}
                              className="absolute end-1 top-1 rounded-full bg-black/60 p-1 text-white transition hover:bg-black/80"
                            >
                              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
                                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                              </svg>
                            </button>
                            {photos.length > 1 && (
                              <div className="absolute inset-x-1 bottom-1 flex items-center justify-between gap-1">
                                <button
                                  type="button"
                                  onClick={() => movePhoto(photo.key, -1)}
                                  disabled={i === 0}
                                  aria-label={`הזזת תמונה ${i + 1} קדימה`}
                                  className="photo-chip disabled:invisible"
                                >
                                  →
                                </button>
                                {i > 0 && (
                                  <button type="button" onClick={() => makeCover(photo.key)} className="photo-chip">
                                    ★ לראשית
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => movePhoto(photo.key, 1)}
                                  disabled={i === photos.length - 1}
                                  aria-label={`הזזת תמונה ${i + 1} אחורה`}
                                  className="photo-chip disabled:invisible"
                                >
                                  ←
                                </button>
                              </div>
                            )}
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  )}

                  {roomLeft > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2 font-sans text-sm">
                      <label className="photo-add">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="sr-only"
                          onChange={(e) => {
                            addFiles(e.target.files);
                            e.target.value = "";
                          }}
                        />
                        🖼️ {photos.length ? "עוד מהגלריה" : "בחירה מהגלריה"}
                      </label>
                      <label className="photo-add">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="sr-only"
                          onChange={(e) => {
                            addFiles(e.target.files);
                            e.target.value = "";
                          }}
                        />
                        📷 צילום
                      </label>
                      <button type="button" onClick={() => setLinkOpen((v) => !v)} className="photo-add">
                        🔗 קישור
                      </button>
                    </div>
                  )}
                  {roomLeft > 0 && linkOpen && (
                    <div className="mt-2 flex gap-2">
                      <input
                        className="card-input"
                        type="url"
                        dir="ltr"
                        autoFocus
                        value={imageLink}
                        onChange={(e) => setImageLink(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addLink();
                          }
                        }}
                        placeholder="https://…/my-dish.jpg"
                      />
                      <button type="button" onClick={addLink} className="photo-add shrink-0">
                        הוספה
                      </button>
                    </div>
                  )}
                  {photos.length === 0 && (
                    <p className="mt-1 font-sans text-xs text-ink-faint">
                      אפשר לבחור כמה תמונות בבת אחת מהגלריה. בטלפון לוחצים לחיצה ארוכה על תמונה ואז מסמנים עוד.
                    </p>
                  )}
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
                            placeholder={profile.example.ingredient[0]}
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
                            placeholder={profile.example.ingredient[1]}
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
                            placeholder={i === 0 ? profile.example.step : "ואז…"}
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
