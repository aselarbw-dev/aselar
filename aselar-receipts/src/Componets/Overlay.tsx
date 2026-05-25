import styles from "./Overlay.module.css";
import smart from "../assets/undraw_mcp-server_7kvc.png";

const Overlay = () => {
  return (
    <div className={styles.wrapper}>
      <div className={styles.content}>
        <img src={smart} alt="Automated Insights" className={styles.image} />
        <div className={styles.text}>
          <h1>Automated Income Statements</h1>
          <ul>
            <li>⚡ Powered by Machine Learning for unmatched precision</li>
            <li>📈 Accurate business forecasting and projections</li>
            <li>🧠 No more tedious manual calculations</li>
            <li>✅ Fewer errors, more convenience</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Overlay;

