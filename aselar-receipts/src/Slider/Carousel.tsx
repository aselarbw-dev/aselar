import React, { useState } from 'react';
import styles from './Carousel.module.css';
import image1 from "../assets/construction-site-1477687_640.jpg"
import image2 from "../assets/nature-5111414_640.jpg"
import image3 from "../assets/building-4803602_1280.jpg"
interface CarouselItem {
  image: string;
  title: string;
  description: string;
  link: string;
}

const carouselData: CarouselItem[] = [
  {
    image: image1,
    title: 'Title 1',
    description: 'This is the description for item 1.',
    link: '/page1',
  },
  {
    image: image2,
    title: 'Title 2',
    description: 'This is the description for item 2.',
    link: '/page2',
  },
  {
    image: image3,
    title: 'Title 3',
    description: 'This is the description for item 3.',
    link: '/page3',
  },
  {
    image: image2,
    title: 'Title 4',
    description: 'This is the description for item 4.',
    link: '/page4',
  },
  {
    image: image1,
    title: 'Title 5',
    description: 'This is the description for item 5.',
    link: '/page5',
  },
];

const Carousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % carouselData.length);
  };

  const handlePrevious = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? carouselData.length - 1 : prevIndex - 1
    );
  };

  const currentItem = carouselData[currentIndex];

  return (
    <div className={styles.carouselContainer}>
      <div className={styles.imageSection}>
        <img
          src={currentItem.image}
          alt={currentItem.title}
          className={styles.image}
        />
      </div>
      <div className={styles.textSection}>
        <h3>{currentItem.title}</h3>
        <p>{currentItem.description}</p>
        <button
          onClick={() => window.location.href = currentItem.link}
          className={styles.linkButton}
        >
          Learn More
        </button>
        <div className={styles.navigationButtons}>
          <button onClick={handlePrevious} className={styles.navButton}>
            Previous
          </button>
          <button onClick={handleNext} className={styles.navButton}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default Carousel;
