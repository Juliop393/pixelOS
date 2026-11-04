import styles from "@/components/dashboard/DashboardHome.module.css"

export type IdeaPreviewKind = "ugc" | "story" | "compare" | "demo"

/** Small abstract compositions that hint at each creative starting point. Purely decorative. */
export default function IdeaPreview({ kind }: { kind: IdeaPreviewKind }) {
  if (kind === "ugc") {
    return (
      <span className={`${styles.ideaPreview} ${styles.previewUgc}`} aria-hidden="true">
        <i className={styles.ugcAvatar} />
        <i className={styles.ugcBubble}><b /><b /></i>
        <i className={`${styles.ugcBubble} ${styles.ugcReply}`}><b /></i>
      </span>
    )
  }

  if (kind === "story") {
    return (
      <span className={`${styles.ideaPreview} ${styles.previewStory}`} aria-hidden="true">
        <i className={styles.storyFrame}>
          <span className={styles.storyBars}><b /><b /><b /></span>
          <span className={styles.storyProduct} />
          <span className={styles.storyCta} />
        </i>
      </span>
    )
  }

  if (kind === "compare") {
    return (
      <span className={`${styles.ideaPreview} ${styles.previewCompare}`} aria-hidden="true">
        <i className={styles.compareSide} />
        <b className={styles.compareVs}>vs</b>
        <i className={`${styles.compareSide} ${styles.compareWinner}`} />
      </span>
    )
  }

  return (
    <span className={`${styles.ideaPreview} ${styles.previewDemo}`} aria-hidden="true">
      <i className={styles.demoOrbit} />
      <i className={styles.demoProduct} />
      <span className={styles.demoSteps}><b /><b /><b /></span>
    </span>
  )
}
