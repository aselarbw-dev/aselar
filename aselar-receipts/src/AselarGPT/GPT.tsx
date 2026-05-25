import React, { useState, useEffect } from "react";
import styles from "./GPT.module.css";
import { fetchBusinesses } from "../Helperfunctions/fetchBusiness";
import { toast } from "react-toastify";
const GPT: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [displayedText, setDisplayedText] = useState<string>("");

  // Load results from local storage on initial load
  useEffect(() => {
    const storedResults = localStorage.getItem("businessResults");
    if (storedResults) {
      setResults(JSON.parse(storedResults));
    }
  }, []);

  const handleSearch = async () => {
    if(searchQuery===""){
        toast.error("You need to search for a business type eg finance,mechanic and car rent")
    }
    if (!searchQuery.trim()) return; // Prevent empty searches

    setError(null); // Reset error
    setDisplayedText(""); // Reset displayed text

    try {
      const data = await fetchBusinesses(searchQuery.trim());
      if (data && data.length > 0) {
        const updatedResults = [...results, ...data];
        setResults(updatedResults); // Append new results
        localStorage.setItem("businessResults", JSON.stringify(updatedResults)); // Save to local storage
      } else {
        setError("No businesses found for this search.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
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
              ? `\nNature of Business: ${business.businessNature}\nPlace: ${business.place}\nNumber: ${business.businessNumber}\nDescription: ${business.businessDescription}\n\n`
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
        <h4>Aselar AI Assistant</h4>
        <div className={styles.chatPlays}>
          <div className={styles.chatDisplay}>
            {results.length > 0 ? (
              results.map((business, index) => (
                <div
                  key={index}
                  onMouseEnter={() =>
                    console.log(`Hovered on: ${business.businessNature}`)
                  }
                  onClick={() => handleRemoveResult(index)}
                  className={styles.show}
                  title="Click to remove"
                >
                  {displayedText || "Search all your business needs."}
                </div>
              ))
            ) : (
              <p>Start searching to see results...</p>
            )}
          </div>
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