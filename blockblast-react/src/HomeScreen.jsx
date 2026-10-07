import './HomeScreen.css'

const HOW_TO_PLAY = [
  {
    number: '01',
    title: 'ブロックを選ぶ',
    description: '下のブロックをタップ。',
    shape: 'single',
  },
  {
    number: '02',
    title: '置く場所を選ぶ',
    description: '置きたい場所の左上マスをタップ。',
    shape: 'corner',
  },
  {
    number: '03',
    title: 'ラインを消す',
    description: '縦か横をそろえてスコアを獲得！',
    shape: 'line',
  },
]

function HomeScreen({ onStart }) {
  return (
    <main className="screen-page home-screen">
      <div className="home-topline">
        <span className="brand-mark" aria-hidden="true">B</span>
        <span className="home-label">PUZZLE GAME</span>
      </div>

      <section className="home-content" aria-labelledby="home-title">
        <div className="home-art" aria-hidden="true">
          <div className="home-art-glow" />
          <div className="home-art-piece home-art-piece-purple"><i /><i /><i /><i /></div>
          <div className="home-art-piece home-art-piece-blue"><i /><i /><i /></div>
          <div className="home-art-piece home-art-piece-orange"><i /><i /><i /><i /></div>
          <span className="home-art-spark home-art-spark-one">✦</span>
          <span className="home-art-spark home-art-spark-two">✦</span>
        </div>

        <p className="screen-eyebrow">かんたんパズル</p>
        <h1 id="home-title" className="home-title">
          BLOCK <span>BLAST</span>
        </h1>
        <p className="home-description">ブロックを置いて、縦・横のラインを消そう。</p>

        <section className="how-to-play" aria-labelledby="how-to-play-title">
          <h2 id="how-to-play-title">遊び方</h2>
          <ol className="how-to-play-list">
            {HOW_TO_PLAY.map((step) => (
              <li className="how-to-play-step" key={step.number}>
                <span className="step-number">{step.number}</span>
                <span className={`step-shape step-shape-${step.shape}`} aria-hidden="true">
                  {Array.from({ length: 4 }, (_, index) => (
                    <i key={index} />
                  ))}
                </span>
                <span className="step-copy">
                  <strong>{step.title}</strong>
                  <span>{step.description}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <button type="button" className="primary-button home-start-button" onClick={onStart}>
          <span>ゲームスタート</span>
          <span className="button-arrow" aria-hidden="true">→</span>
        </button>
      </section>

      <div className="home-footer">
        <span>じっくり考えて、ハイスコアを目指そう</span>
        <span className="footer-dots" aria-hidden="true">● ● ●</span>
      </div>
    </main>
  )
}

export default HomeScreen
