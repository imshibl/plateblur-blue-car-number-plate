import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import clearPlateDemoSrc from "../assets/demo-photos/plate-clear.webp?inline";
import distantPlateDemoSrc from "../assets/demo-photos/plate-distant.webp?inline";

export const Route = createFileRoute("/")({
  component: HomePage,
});

type ImageItem = {
  id: string;
  file: File;
  originalUrl: string;
  blurredUrl?: string;
  detected?: number;
  status: "processing" | "ready" | "error";
  error?: string;
};

type DemoImage = {
  id: string;
  src: string;
  filename: string;
  title: string;
  description: string;
  badge: string;
  tone: "good" | "caution";
  alt: string;
  sourceUrl: string;
  author: string;
  license: string;
  licenseUrl: string;
};

const DEMO_IMAGES: DemoImage[] = [
  {
    id: "clear-plate",
    src: clearPlateDemoSrc,
    filename: "clear-plate-demo.webp",
    title: "Clear, close plate",
    description: "Large and sharp, with a mostly frontal view.",
    badge: "Best case",
    tone: "good",
    alt: "Front three-quarter view of a black Ferrari with a clear front plate",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Bruges_Belgium_Ferrari-with-special-car-plate-XXXXXX-01.jpg",
    author: "CEphoto, Uwe Aranas",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
  },
  {
    id: "distant-plate",
    src: distantPlateDemoSrc,
    filename: "distant-plate-demo.webp",
    title: "Distant rally car",
    description: "The plate is tiny at this distance and easy to miss.",
    badge: "Hard case",
    tone: "caution",
    alt: "A rally car approaching in the distance on a tree-lined road",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:0_car,_40._ADAC_Stormarn_Rallye,_Luetjensee_(TR256767).jpg",
    author: "Matti Blume",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
];

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

function HomePage() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const urls = useRef(new Set<string>());
  const controllers = useRef(new Map<string, AbortController>());
  const activeImage = images.find((image) => image.id === activeId);

  useEffect(
    () => () => {
      controllers.current.forEach((controller) => controller.abort());
      urls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  function rememberUrl(url: string) {
    urls.current.add(url);
    return url;
  }

  function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    const validFiles = files.filter((file) => file.type.startsWith("image/"));
    if (validFiles.length !== files.length) {
      setNotice("Some files were skipped. Choose image files to continue.");
    } else {
      setNotice("");
    }

    const added = validFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      originalUrl: rememberUrl(URL.createObjectURL(file)),
      status: "processing" as const,
    }));

    if (!added.length) return;
    setImages((current) => [...current, ...added]);
    setActiveId((current) => current ?? added[0].id);
    added.forEach((image) => void processFile(image));
  }

  function tryDemo(demo: DemoImage) {
    const base64 = demo.src.slice(demo.src.indexOf(",") + 1);
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0),
    );
    addFiles([new File([bytes], demo.filename, { type: "image/webp" })]);
  }

  async function processFile(image: ImageItem) {
    const controller = new AbortController();
    controllers.current.set(image.id, controller);
    try {
      const body = new FormData();
      body.append("image", image.file);
      const response = await fetch(`${API_URL}/api/blur`, {
        method: "POST",
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        const result = (await response.json()) as { detail?: string };
        throw new Error(result.detail ?? "Could not process this image.");
      }

      const blurredUrl = rememberUrl(
        URL.createObjectURL(await response.blob()),
      );
      const detected = Number(response.headers.get("X-Detected-Plates") ?? 0);
      setImages((current) =>
        current.map((item) =>
          item.id === image.id
            ? { ...item, blurredUrl, detected, status: "ready" }
            : item,
        ),
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setImages((current) =>
        current.map((item) =>
          item.id === image.id
            ? {
                ...item,
                status: "error",
                error:
                  error instanceof TypeError
                    ? "Could not reach the image service. Check that the backend is running."
                    : error instanceof Error
                      ? error.message
                      : "Could not process this image.",
              }
            : item,
        ),
      );
    } finally {
      if (controllers.current.get(image.id) === controller) {
        controllers.current.delete(image.id);
      }
    }
  }

  function clearImages() {
    controllers.current.forEach((controller) => controller.abort());
    controllers.current.clear();
    urls.current.forEach((url) => URL.revokeObjectURL(url));
    urls.current.clear();
    setImages([]);
    setActiveId(null);
    setNotice("");
    if (inputRef.current) inputRef.current.value = "";
  }

  const completedCount = images.filter(
    (image) => image.status === "ready",
  ).length;

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="PlateBlur home">
          <span className="brand-mark" aria-hidden="true">
            <ShieldIcon />
          </span>
          <span>plateblur</span>
        </a>
        <div className="topbar-right">
          <span className="privacy-pill">
            <span className="privacy-dot" />
            Private by design
          </span>
          <a className="top-link" href="#use-cases">
            Use cases
          </a>
          <a className="top-link" href="#how-it-works">
            How it works
          </a>
        </div>
      </header>

      <section className="hero">
        <div className="eyebrow">
          <span className="eyebrow-icon">
            <SparkleIcon />
          </span>
          YOUR PHOTOS, YOUR PRIVACY
        </div>
        <h1>
          Share the ride.
          <br />
          <span>Not the plate.</span>
        </h1>
        <p className="hero-copy">
          Automatically blur license plates in your vehicle photos.
          <br className="desktop-break" /> Simple, secure, and done in seconds.
        </p>
        <div className="trust-row">
          <span>
            <CheckIcon /> No account needed
          </span>
          <span>
            <CheckIcon /> Images never stored
          </span>
          <span>
            <CheckIcon /> Free to use
          </span>
        </div>
      </section>

      <section className="workspace" aria-label="Image blurring workspace">
        <div
          className={`upload-card${dragging ? " is-dragging" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            addFiles(event.dataTransfer.files);
          }}
        >
          <input
            ref={inputRef}
            className="visually-hidden"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/bmp"
            multiple
            onChange={(event) => {
              if (event.target.files) addFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <div className="upload-icon">
            <UploadIcon />
          </div>
          <div className="upload-message">
            <strong>Drop your photos here</strong>
            <span>
              or{" "}
              <button
                className="text-button"
                onClick={() => inputRef.current?.click()}
              >
                browse files
              </button>{" "}
              from your device
            </span>
          </div>
          <button
            className="button button-primary upload-button"
            onClick={() => inputRef.current?.click()}
          >
            <UploadIcon />
            Choose images
          </button>
          <span className="file-hint">
            JPG, PNG, WEBP or BMP <i /> Up to 20 MB each
          </span>
          {notice && (
            <span className="notice" role="status">
              {notice}
            </span>
          )}
        </div>

        <div className="results-card">
          <div className="results-heading">
            <div className="results-title">
              <span className="results-icon">
                <ImageIcon />
              </span>
              <div>
                <h2>Your images</h2>
                <p>
                  {images.length
                    ? `${completedCount} of ${images.length} ready`
                    : "Your processed images will appear here"}
                </p>
              </div>
            </div>
            {images.length > 0 && (
              <button className="clear-button" onClick={clearImages}>
                Clear all
              </button>
            )}
          </div>

          {images.length === 0 ? (
            <div className="empty-state">
              <div className="empty-art">
                <div className="empty-photo">
                  <ImageIcon />
                </div>
                <span className="empty-sparkle sparkle-one">✦</span>
                <span className="empty-sparkle sparkle-two">✦</span>
              </div>
              <strong>Ready when you are</strong>
              <span>
                Add a vehicle photo to get started.
                <br />
                We’ll take care of the plates.
              </span>
              <button
                className="empty-demo-button"
                onClick={() => tryDemo(DEMO_IMAGES[0])}
              >
                Try a demo photo
              </button>
            </div>
          ) : (
            <div className="image-workspace">
              <div className="image-tabs">
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    className={`image-tab${image.id === activeId ? " active" : ""}`}
                    onClick={() => setActiveId(image.id)}
                    title={image.file.name}
                  >
                    <span className="tab-index">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="tab-name">{image.file.name}</span>
                    <span className={`tab-status ${image.status}`} />
                  </button>
                ))}
              </div>
              {activeImage && (
                <>
                  <div className="preview-grid">
                    <Preview
                      label="Original"
                      source={activeImage.originalUrl}
                    />
                    <Preview
                      label="PlateBlur"
                      source={activeImage.blurredUrl}
                      loading={activeImage.status === "processing"}
                      error={activeImage.error}
                      detected={activeImage.detected}
                    />
                  </div>
                  {activeImage.status === "ready" && activeImage.blurredUrl && (
                    <div className="download-row">
                      <span className="success-label">
                        <CheckIcon /> Plate blur complete
                      </span>
                      <a
                        className="button button-download"
                        href={activeImage.blurredUrl}
                        download={`${activeImage.file.name.replace(/\.[^.]+$/, "")}-blurred.jpg`}
                      >
                        <DownloadIcon /> Download image
                      </a>
                    </div>
                  )}
                  {activeImage.status === "error" && (
                    <div className="error-row">
                      <span>{activeImage.error}</span>
                      <button
                        className="text-button"
                        onClick={() => {
                          setImages((current) =>
                            current.map((item) =>
                              item.id === activeImage.id
                                ? {
                                    ...item,
                                    status: "processing",
                                    error: undefined,
                                  }
                                : item,
                            ),
                          );
                          void processFile(activeImage);
                        }}
                      >
                        Try again
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </section>

      <section
        className="demo-section"
        id="demo-images"
        aria-labelledby="demo-heading"
      >
        <div className="demo-heading">
          <span className="section-kicker">NO PHOTO? TRY A SAMPLE</span>
          <h2 id="demo-heading">See how plate visibility affects results.</h2>
          <p>
            These sample photos go through the same blurring process as your
            uploads.
          </p>
        </div>
        <div className="demo-grid">
          {DEMO_IMAGES.map((demo) => (
            <article className="demo-card" key={demo.id}>
              <div className="demo-image">
                <img src={demo.src} alt={demo.alt} loading="lazy" />
                <span className={`demo-badge ${demo.tone}`}>{demo.badge}</span>
              </div>
              <div className="demo-card-body">
                <div className="demo-card-main">
                  <div>
                    <h3>{demo.title}</h3>
                    <p>{demo.description}</p>
                  </div>
                  <button
                    className="button demo-button"
                    onClick={() => tryDemo(demo)}
                  >
                    Try this
                  </button>
                </div>
                <div className="demo-credit">
                  <a href={demo.sourceUrl} target="_blank" rel="noreferrer">
                    Photo by {demo.author}
                  </a>
                  <span>·</span>
                  <a href={demo.licenseUrl} target="_blank" rel="noreferrer">
                    {demo.license}
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
        <p className="demo-disclaimer">
          <LockIcon />
          <span>
            <strong>Review before sharing.</strong> Small, tilted, blurry, or
            blocked plates can be missed. Blurring is not guaranteed.
          </span>
        </p>
      </section>

      <section
        className="use-cases"
        id="use-cases"
        aria-labelledby="use-cases-heading"
      >
        <div className="use-case-heading">
          <span className="section-kicker">MADE FOR REAL-LIFE SHARING</span>
          <h2 id="use-cases-heading">A safer way to share vehicle photos.</h2>
          <p>
            Blur visible plates before posting car photos online, sending them
            to a buyer, or sharing a day out.
          </p>
        </div>
        <div className="use-case-grid">
          <article className="use-case-card">
            <div className="use-case-icon">
              <ImageIcon />
            </div>
            <h3>Car listings and classifieds</h3>
            <p>
              Blur a readable registration plate in vehicle photos before
              publishing a sale listing.
            </p>
          </article>
          <article className="use-case-card">
            <div className="use-case-icon">
              <SparkleIcon />
            </div>
            <h3>Social media and forums</h3>
            <p>
              Give car-spotting, meet-up, and ownership photos a privacy check
              before you post.
            </p>
          </article>
          <article className="use-case-card">
            <div className="use-case-icon">
              <ScanIcon />
            </div>
            <h3>Road trips and events</h3>
            <p>
              Process a batch of travel or event photos before sharing them with
              friends and family.
            </p>
          </article>
          <article className="use-case-card">
            <div className="use-case-icon">
              <LockIcon />
            </div>
            <h3>Everyday vehicle privacy</h3>
            <p>
              Preview each result and download a JPEG when you want to hide a
              plate from a vehicle photo.
            </p>
          </article>
        </div>
        <a className="use-case-link" href="#demo-images">
          Try a sample photo
          <span aria-hidden="true">→</span>
        </a>
      </section>

      <section className="how-section" id="how-it-works">
        <div className="section-heading">
          <span className="section-kicker">MADE FOR PEACE OF MIND</span>
          <h2>Privacy shouldn’t be complicated.</h2>
        </div>
        <div className="feature-grid">
          <Feature
            icon={<ScanIcon />}
            number="01"
            title="Drop in a photo"
            description="Choose one image or a whole batch. We support all the formats you already use."
          />
          <Feature
            icon={<SparkleIcon />}
            number="02"
            title="Plates get blurred"
            description="Our license plate detector finds and blurs visible plates automatically."
          />
          <Feature
            icon={<LockIcon />}
            number="03"
            title="Download & share"
            description="Your photos are processed in memory and never saved to a server."
          />
        </div>
      </section>

      <footer className="footer">
        <a className="brand footer-brand" href="/">
          <span className="brand-mark">
            <ShieldIcon />
          </span>
          <span>plateblur</span>
        </a>
        <span>Made for sharing a little more safely.</span>
        <span className="footer-status">
          <span className="privacy-dot" /> Images stay yours
        </span>
      </footer>
    </main>
  );
}

function Preview({
  label,
  source,
  loading = false,
  error,
  detected,
}: {
  label: string;
  source?: string;
  loading?: boolean;
  error?: string;
  detected?: number;
}) {
  return (
    <div className="preview-panel">
      <div className="preview-label">
        <span>
          {label === "PlateBlur" ? (
            <>
              <span className="brand-dot" /> {label}
            </>
          ) : (
            label
          )}
        </span>
        {label === "PlateBlur" &&
          detected !== undefined &&
          !loading &&
          !error && (
            <span className="detected-count">
              {detected} {detected === 1 ? "plate" : "plates"}
            </span>
          )}
      </div>
      <div className="preview-image">
        {source && <img src={source} alt={`${label} preview`} />}
        {loading && (
          <div className="preview-overlay">
            <span className="spinner" />
            <span>Finding plates…</span>
          </div>
        )}
        {error && (
          <div className="preview-overlay preview-error">
            <span>{error}</span>
          </div>
        )}
        {!source && !loading && !error && (
          <div className="preview-placeholder">
            <ImageIcon />
          </div>
        )}
      </div>
    </div>
  );
}

function Feature({
  icon,
  number,
  title,
  description,
}: {
  icon: React.ReactNode;
  number: string;
  title: string;
  description: string;
}) {
  return (
    <article className="feature-card">
      <div className="feature-top">
        <span className="feature-icon">{icon}</span>
        <span className="feature-number">{number}</span>
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3 19 6v5c0 4.7-3 8-7 10-4-2-7-5.3-7-10V6l7-3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="m9 12 2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 16V4m0 0L7 9m5-5 5 5M5 15v4a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="8.5" cy="9" r="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="m4 17 5-5 3 3 3-4 5 6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m12 3 1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8L12 3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z"
        fill="currentColor"
      />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="m5 10 3.2 3.2L15.5 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4v11m0 0 4-4m-4 4-4-4M5 17v2a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="4"
        y="10"
        width="16"
        height="11"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
function ScanIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3M7 12h10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
