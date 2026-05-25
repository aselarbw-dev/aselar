import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../Store/store";
import { removeService } from "../Store/store";
 import { Service } from "../Store/store"; 
import styles from "./ServiceList.module.css";

const ServicesList: React.FC = () => {
  const services:Service[] = useSelector((state: RootState) => state.services.services);
  const dispatch = useDispatch();

  const handleDelete = (id: string) => {
    dispatch(removeService(id));
  };

  return (
    <div className={styles.servicesList}>
      {services.length === 0 ? (
        <p>No services added yet.</p>
      ) : (
        <div className={styles.container}>
          {services.map((service) => (
            <div key={service.id} className={styles.serviceItem}>
              <div >
                <h4>{service.name}</h4>
                <p>Rate per Time: {service.rate}</p>
                <p>Time Taken: {service.time}</p>
                <p>Sales: {service.sales}</p>
                <p>Profit: {service.profit}</p>
                {service.expenses > 0 && <p>Expenses: {service.expenses}</p>}
                {service.description && (
                  <p>Description: {service.description}</p>
                )}

                   <button onClick={() => handleDelete(service.id)}>Delete</button>
              </div>
              
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ServicesList;
