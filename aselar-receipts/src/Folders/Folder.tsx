import React from 'react'
import styles from "./Folder.module.css"
import FileList from '../Uploads/FileList'
const Folder:React.FC = () => {
  return (
    <div className={styles.folders}>
      <div className={styles.files}>
  <FileList/>

         </div>
         
      </div>
    
  )
}

export default Folder