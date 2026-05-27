import React from 'react'

interface Props {
    children?: React.ReactNode
  }
const Layout:React.FC<Props> = (props) => {
  return (
    <>

<main  style={{ minHeight: "80vh" }}>
 
    {props.children}
</main>
    </>
  )
}

export default Layout