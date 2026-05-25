import styles from "../Componets/Value.module.css"
import team from "../assets/team-8499960_1280.jpg"

const Value = () => {
  return (
    <div className={styles.mainCover}>

        <div className={styles.imageWrapper}>
            <img src={team} alt="team" />
        </div>
        <div className={styles.textValue}>
            <h5 className={styles.minor}>Our Value offering</h5>
            <h1 className={styles.bigger}>Bringing your business records and transactions together effortlessly</h1>
            <p className={styles.para}>Refrain the hustle of being behind with records filing and 
                become prudent with Aselar today.
                Refrain the hustle of being behind with records filing and 
                become prudent with Aselar today.
                Refrain the hustle of being behind with records filing and 
                become prudent with Aselar today.
                Refrain the hustle of being behind with records filing and 
                become prudent with Aselar today.
                </p>
            
        </div>
        </div>
  )
}

export default Value