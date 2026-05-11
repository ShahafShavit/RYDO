GROOPY_ORD = {
    "קל": 2.0,
    "מתאים למתחילים": 2.0,
    "בינוני-קל": 3.5,
    "בינוני": 5.0,
    "בינוני-קשה": 7.0,
    "למתקדמים": 8.5,
}

def groopy_to_ord(s) -> float | None:
    if s is None or (isinstance(s, float) and pd.isna(s)):
        return None
    t = str(s).strip()
    if not t or t.lower() == "nan":
        return None
    return GROOPY_ORD.get(t)

plot_df = res.copy()
plot_df["groopy_ord"] = plot_df["difficulty_groopy"].map(groopy_to_ord)
miss = plot_df.loc[plot_df["difficulty_groopy"].astype(str).str.strip().ne("") & plot_df["groopy_ord"].isna(), "difficulty_groopy"]
unmapped = miss.unique().tolist()
if unmapped:
    print("Groopy labels with no ordinal mapping (add to GROOPY_ORD):", unmapped)

plot_clean = plot_df.dropna(subset=["groopy_ord", "physics_score_1_10"]).copy()
plot_clean = plot_clean[np.isfinite(plot_clean["groopy_ord"]) & np.isfinite(plot_clean["physics_score_1_10"])]

fig, ax = plt.subplots(figsize=(7, 7))
if len(plot_clean):
    ax.scatter(
        plot_clean["groopy_ord"],
        plot_clean["physics_score_1_10"],
        s=45,
        alpha=0.7,
        edgecolors="k",
        linewidths=0.35,
    )
    ax.set_xlabel("Groopy difficulty (ordinal mapping, diagnostic only)")
    ax.set_ylabel("Physics score (1–10)")
    ax.set_title("Opinion vs mechanical intensity (read-only)")
    ax.set_xlim(0.5, 10.5)
    ax.set_ylim(0.5, 10.5)
else:
    ax.text(
        0.5,
        0.5,
        "No finite (Groopy, physics) pairs to plot — check normalization and label mapping.",
        ha="center",
        va="center",
        transform=ax.transAxes,
    )
plt.tight_layout()
plt.show()

print("Plotted rows:", len(plot_clean), "/", len(res))

# Correlation vs Groopy ordinal (same pairs as scatter; diagnostic only)
if len(plot_clean) >= 3:
    xo = plot_clean["groopy_ord"].to_numpy(dtype=float)
    ys = plot_clean["physics_score_1_10"].to_numpy(dtype=float)
    pearson_r = float(np.corrcoef(xo, ys)[0, 1])
    rx = pd.Series(xo).rank(method="average").to_numpy()
    ry = pd.Series(ys).rank(method="average").to_numpy()
    spearman_rho = float(np.corrcoef(rx, ry)[0, 1])
    print(f"Pearson r (Groopy ordinal vs physics score): {pearson_r:.4f}")
    print(f"Spearman rho (Groopy ordinal vs physics score): {spearman_rho:.4f}")
    dens_p = plot_clean["intensity_density_J_per_km"].to_numpy(dtype=float)
    mden = np.isfinite(dens_p) & (dens_p > 0)
    if int(mden.sum()) >= 3:
        ld = np.log(dens_p[mden])
        xod = xo[mden]
        print(
            f"Pearson r (Groopy ordinal vs log intensity density): {float(np.corrcoef(xod, ld)[0, 1]):.4f}"
        )
else:
    print("Too few paired rows for correlation (need ≥3).")