import React, { useState, useEffect } from "react";
import styles from "./GPT.module.css";
import { fetchBusinesses } from "../Helperfunctions/fetchBusiness";
import { toast } from "react-toastify";

// Define a clear interface for business data
interface Business {
  businessNature: string;
  place: string;
  businessNumber: string;
  businessDescription: string;
}

const GPT: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [results, setResults] = useState<Business[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [displayedText, setDisplayedText] = useState<string>("");

  // Load results from local storage on initial load
  useEffect(() => {
    const storedResults = localStorage.getItem("businessResults");
    if (storedResults) {
      try {
        const parsedResults: Business[] = JSON.parse(storedResults);
        // Validate parsed results
        const validResults = parsedResults.filter(
          (business) => 
            business && 
            typeof business.businessNature === 'string' &&
            typeof business.place === 'string' &&
            typeof business.businessNumber === 'string' &&
            typeof business.businessDescription === 'string'
        );
        setResults(validResults);
      } catch (err) {
        console.error("Error parsing stored results", err);
        setResults([]);
      }
    }
  }, []);

  const handleSearch = async () => {
    if(searchQuery.trim() === ""){
        toast.error("You need to search for a business type eg finance, mechanic and car rent");
        return;
    }

    setError(null); // Reset error
    setDisplayedText(""); // Reset displayed text

    try {
      const data = await fetchBusinesses(searchQuery.trim());
      if (data && Array.isArray(data) && data.length > 0) {
        // Validate incoming data matches Business interface
        const validData = data.filter(
          (business): business is Business => 
            business !== null &&
            typeof business.businessNature === 'string' &&
            typeof business.place === 'string' &&
            typeof business.businessNumber === 'string' &&
            typeof business.businessDescription === 'string'
        );

        const updatedResults = [...results, ...validData];
        setResults(updatedResults); // Append new results
        localStorage.setItem("businessResults", JSON.stringify(updatedResults)); // Save to local storage
      } else {
        setError("No businesses found for this search.");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
    }
    setSearchQuery(""); // Clear input after search
  };

  const handleRemoveResult = (index: number) => {
    const updatedResults = results.filter((_, i) => i !== index); // Remove the specific result
    setResults(updatedResults);
    localStorage.setItem("businessResults", JSON.stringify(updatedResults)); // Update local storage
  };

  const handleClearResults = () => {
    setResults([]); // Clear all results
    localStorage.removeItem("businessResults"); // Remove from local storage
    setDisplayedText(""); // Reset displayed text
  };

  useEffect(() => {
    if (results.length > 0) {
      let fullText = results
        .map(
          (business) =>
            business
              ? `\nNature of Business: ${business.businessNature || 'N/A'}\nPlace: ${business.place || 'N/A'}\nNumber: ${business.businessNumber || 'N/A'}\nDescription: ${business.businessDescription || 'N/A'}\n\n`
              : ""
        )
        .join("");
      let currentIndex = 0;

      const interval = setInterval(() => {
        if (currentIndex < fullText.length) {
          setDisplayedText((prev) => prev + fullText[currentIndex]);
          currentIndex++;
        } else {
          clearInterval(interval);
        }
      }, 50); // Typing speed
      return () => clearInterval(interval);
    }
  }, [results]);

  return (
    <div className={styles.gptCover}>
      <div className={styles.gptChat}>
        {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
        <h4>Search Businesses Here</h4>
        <div className={styles.chatPlays}>
          <div className={styles.chatDisplay}>
            {results.length > 0 ? (
              results.map((business, index) => (
                <div
                  key={index}
                  onMouseEnter={() =>
                    console.log(`Hovered on: ${business.businessNature || 'Unknown'}`)
                  }
                  onClick={() => handleRemoveResult(index)}
                  className={styles.show}
                  title="Click to remove"
                >
                  {business.businessNature || 'Unknown Business'}
                </div>
              ))
            ) : (
              <p>Start searching to see results...</p>
            )}
          </div>
          <pre>{displayedText || "Start searching to see results..."}</pre>
          <div className={styles.chatButton}>
            <input
              type="search"
              placeholder="Enter business nature (e.g., Technology)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button onClick={handleSearch}>Search</button>
            <button onClick={handleClearResults} style={{ marginLeft: "10px" }}>
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GPT;