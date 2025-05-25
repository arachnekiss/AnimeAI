import React from 'react'
import ReactDOM from 'react-dom/client'
import UIShowcase from './app/components/UIShowcase.simple'
import './app/components/UIShowcase.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <UIShowcase />
  </React.StrictMode>,
)
