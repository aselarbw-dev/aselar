
{
/*
import React, { useState, useEffect } from "react";
import styles from "./Calendar.module.css";

const Calendar: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const currentMonth = currentTime.toLocaleString("default", { month: "long" });
  const currentYear = currentTime.getFullYear();
  const today = currentTime.getDate(); // Get today's date

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Generate the days of the current month
  const generateDays = () => {
    const daysInMonth = new Date(currentYear, currentTime.getMonth() + 1, 0).getDate();
    const firstDayIndex = new Date(currentYear, currentTime.getMonth(), 1).getDay();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Add blank spaces for the first week
    return Array(firstDayIndex)
      .fill("")
      .concat(days);
  };

  const days = generateDays();

  return (
    <div className={styles.calendarContainer}>
      <div className={styles.timeDisplay}>
        {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </div>
      <div className={styles.monthDisplay}>
        {currentMonth} {currentYear}
      </div>
      <div className={styles.daysHeader}>
        {daysOfWeek.map((day) => (
          <div key={day} className={styles.dayHeader}>
            {day}
          </div>
        ))}
      </div>
      <div className={styles.daysGrid}>
        {days.map((day, index) => (
          <div
            key={index}
            className={`${day ? styles.day : styles.emptyDay} ${
              day === today ? styles.currentDay : ""
            }`}
          >
            {day}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Calendar;


*/


}
