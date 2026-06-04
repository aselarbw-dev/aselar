import React, { useState } from "react";
import { useDispatch } from "react-redux";
import styles from "./ServiceForm.module.css";
import { addService } from "../Store/store";

const ServiceForm: React.FC = () => {
  const [name, setName] = useState("");
  const [rate, setRate] = useState<number | string>("");
  const [time, setTime] = useState<number | string>("");
  const [description, setDescription] = useState("");
  const [expenses, setExpenses] = useState<number | string>("");

  const dispatch = useDispatch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !rate || !time) {
      alert("Please fill in the required fields: Name, Rate, and Time.");
      return;
    }

    const serviceData = {
      name,
      rate: parseFloat(rate as string),
      time: parseFloat(time as string),
      description,
      expenses: expenses ? parseFloat(expenses as string) : 0, // Optional expenses
    };

    try {
      
      // Send data to the backend
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/create-services`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(serviceData),
      });

      if (!response.ok) {
        throw new Error("Failed to add service.");
      }

      const savedService = await response.json();

      // Dispatch to the store
      dispatch(addService(savedService));
      setName("");
      setRate("");
      setTime("");
      setDescription("");
      setExpenses("");
    } catch (error) {
      console.error("Error adding service:", error);
      alert("Error adding service. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.serviceForm}>
      <h4>Create Services</h4>
      <div className={styles.formGroup}>
        <label>Service Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className={styles.formGroup}>
        <label>Rate (per hour/minute) *</label>
        <input
          type="number"
          step="0.01"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          required
        />
      </div>
      <div className={styles.formGroup}>
        <label>Time Required (in hours/minutes/day) *</label>
        <input
          type="number"
          step="0.01"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          required
        />
      </div>
      <div className={styles.formGroup}>
        <label>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className={styles.formGroup}>
        <label>Expenses</label>
        <input
          type="number"
          step="0.01"
          value={expenses}
          onChange={(e) => setExpenses(e.target.value)}
        />
      </div>
      <button type="submit">Add Service</button>
    </form>
  );
};

export default ServiceForm;

