import { useState, useEffect } from 'react'

function App() {
  // 1. useState sets up memory for our component.
  // 'visits' is the data itself (starts as an empty array []).
  // 'setVisits' is the function we use to update the data later.
  const [visits, setVisits] = useState([])
  
  // We also set up memory for errors or loading states
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  // 2. useEffect runs some code automatically when the component first appears on screen.
  // The empty array [] at the end means "only run this once".
  useEffect(() => {
    // We define an async function to fetch data from our Go backend
    async function fetchVisits() {
      try {
        // This is where React talks to the Go Tracker API running on port 3000
        const response = await fetch('http://localhost:3000/api/visits')
        
        if (!response.ok) {
          throw new Error('Network response was not ok')
        }
        
        // Convert the JSON response from Go into a JavaScript array
        const data = await response.json()
        
        // Save the data into our component's memory
        setVisits(data)
      } catch (err) {
        // If the Go server is offline or errors out, save the error 
        setError(err.message)
      } finally {
        // Once we either succeed or fail, we are no longer loading
        setLoading(false)
      }
    }

    // Call the function we just defined
    fetchVisits()
  }, [])

  // 3. THIS IS WHAT APPEARS ON THE SCREEN (The "Render" phase)
  
  // If we are still waiting for the Go server, show a loading message
  if (loading) return <div>Loading data from Go Backend...</div>
  
  // If the Go server failed, show the error
  if (error) return <div>Error: {error} (Is the Go server running on port 3000?)</div>

  // If we succeeded, show the list!
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Nexus Diet - Raw Data View</h1>
      <p>This is a raw connection test between React and the Go Backend.</p>
      
      {visits.length === 0 ? (
        <p>No visits found in the database. Go browse an article with the extension!</p>
      ) : (
        <ul style={{ textAlign: 'left', background: '#f5f5f5', padding: '20px', borderRadius: '8px' }}>
          {/* We loop through our array of visits and create an HTML list item <li> for each one */}
          {visits.map((visit, index) => (
            <li key={index} style={{ marginBottom: '10px' }}>
              <strong>Date:</strong> {new Date(visit.timestamp).toLocaleString()}<br />
              <strong>URL:</strong> <a href={visit.url} target="_blank" rel="noreferrer">{visit.url}</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default App
