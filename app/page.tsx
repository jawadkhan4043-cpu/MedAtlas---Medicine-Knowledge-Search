"use client";

import { useState, type FormEvent } from "react";

type Medicine = {
  rxcui?: string;
  name?: string;
  synonym?: string;
  tty?: string;
};

type Label = {
  id: string;
  brand: string;
  generic: string;
  manufacturer: string;
  ingredient: string;
  purpose: string;
  uses: string;
  warnings: string;
};

type SearchResponse = {
  error?: string;
  query?: string;
  medicines: Medicine[];
  labels: Label[];
  sources: {
    rxNormAvailable: boolean;
    fdaAvailable: boolean;
  };
};

const suggestions = ["ibuprofen", "loratadine", "metformin"];

export default function Home() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function searchMedicine(term: string) {
    const cleanTerm = term.trim();
    if (cleanTerm.length < 2) {
      setError("Enter at least two letters to search.");
      return;
    }

    setQuery(cleanTerm);
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(
        `/api/medicines?q=${encodeURIComponent(cleanTerm)}`,
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Search failed. Please try again.");
      }

      setResult(data as SearchResponse);
    } catch (searchError) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void searchMedicine(query);
  }

  const hasResults =
    (result?.medicines.length ?? 0) > 0 || (result?.labels.length ?? 0) > 0;

  return (
    <main className="page">
      <header className="topbar">
        <a className="brand" href="#" aria-label="MedAtlas home">
          <span className="brand-icon">M</span>
          <span>MedAtlas <span className="brand-subtitle">Knowledge Search</span></span>
        </a>
        <span className="source-pill"><span /> PUBLIC DATA SOURCES</span>
      </header>

      <section className="hero">
        <p className="eyebrow">A CLEARER WAY TO LOOK UP MEDICINES</p>
        <h1>Search a name.<br /><em>Explore the reference.</em></h1>
        <p className="hero-copy">
          Search common brand or generic names to find standardized medicine
          matches and public U.S. product-label information.
        </p>

        <form className="search-form" onSubmit={handleSubmit}>
          <span aria-hidden="true" className="search-icon">⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try a brand or generic name"
            aria-label="Medicine name"
          />
          <button type="submit" disabled={loading}>
            {loading ? "Searching…" : "Search"}
          </button>
        </form>

        <div className="suggestions">
          <span>Try:</span>
          {suggestions.map((suggestion) => (
            <button key={suggestion} onClick={() => void searchMedicine(suggestion)}>
              {suggestion}
            </button>
          ))}
        </div>
      </section>

      <section className="notice">
        <span className="notice-icon">i</span>
        <p>
          <strong>Reference information only.</strong> This site does not give
          medical advice or tell you what to take. Check with a pharmacist or
          healthcare professional about personal medication questions.
        </p>
      </section>

      {error && <div className="error-box" role="alert">{error}</div>}

      {loading && (
        <div className="loading-box" role="status">
          Searching NLM RxNorm and openFDA…
        </div>
      )}

      {result && !loading && (
        <section className="results">
          <div className="results-heading">
            <div>
              <p className="eyebrow">SEARCH RESULTS</p>
              <h2>Results for “{result.query}”</h2>
            </div>
            <span className="result-count">
              {result.medicines.length + result.labels.length} records
            </span>
          </div>

          {!hasResults && (
            <div className="empty-box">
              No matching records were returned. Try a generic name or a
              different spelling.
            </div>
          )}

          {result.medicines.length > 0 && (
            <section className="result-section">
              <div className="source-heading">
                <h3>Standardized medicine matches</h3>
                <span>NLM RxNorm</span>
              </div>
              <div className="medicine-grid">
                {result.medicines.slice(0, 12).map((medicine, index) => (
                  <article
                    className="medicine-card"
                    key={medicine.rxcui ?? `${medicine.name}-${index}`}
                  >
                    <div className="medicine-symbol" aria-hidden="true">✳</div>
                    <div>
                      <h4>{medicine.name ?? "Name not provided"}</h4>
                      {medicine.synonym && (
                        <p className="synonym">Also listed as: {medicine.synonym}</p>
                      )}
                      <div className="chips">
                        {medicine.tty && <span>{medicine.tty}</span>}
                        {medicine.rxcui && <span>RxCUI {medicine.rxcui}</span>}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {result.labels.length > 0 && (
            <section className="result-section">
              <div className="source-heading">
                <h3>Public product-label records</h3>
                <span>U.S. FDA / openFDA</span>
              </div>
              <div className="label-list">
                {result.labels.map((label) => (
                  <details className="label-card" key={label.id}>
                    <summary>
                      <span>
                        <strong>{label.brand || label.generic || "Product label"}</strong>
                        <small>
                          {[label.generic, label.manufacturer]
                            .filter(Boolean)
                            .join(" · ") || "Product details"}
                        </small>
                      </span>
                      <span className="expand-mark">+</span>
                    </summary>

                    <div className="label-content">
                      {label.ingredient && (
                        <InfoBlock title="Active ingredient" text={label.ingredient} />
                      )}
                      {label.purpose && (
                        <InfoBlock title="Purpose" text={label.purpose} />
                      )}
                      {label.uses && (
                        <InfoBlock title="Label information about use" text={label.uses} />
                      )}
                      {label.warnings && (
                        <InfoBlock title="Warnings listed on the label" text={label.warnings} />
                      )}
                      {!label.ingredient && !label.purpose && !label.uses && !label.warnings && (
                        <p className="no-detail">
                          This record has limited readable label sections.
                        </p>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          )}

          <div className="source-status">
            <span>{result.sources.rxNormAvailable ? "✓" : "—"} NLM RxNorm</span>
            <span>{result.sources.fdaAvailable ? "✓" : "—"} openFDA labels</span>
          </div>
        </section>
      )}

      {!result && !loading && !error && (
        <section className="welcome">
          <div className="welcome-mark" aria-hidden="true">⌕</div>
          <h2>Your medicine reference starts here</h2>
          <p>
            Search by brand name or generic name. Results may vary because
            public databases do not cover every medicine or product.
          </p>
        </section>
      )}

      <footer className="footer">
        <p>
          Uses public data from the U.S. National Library of Medicine and FDA.
          NLM does not endorse this product.
        </p>
        <p>
          openFDA label information may not match the labeling on a product
          currently being sold. Always verify with a qualified professional.
        </p>
      </footer>
    </main>
  );
}

function InfoBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="info-block">
      <h5>{title}</h5>
      <p>{text}</p>
    </div>
  );
}