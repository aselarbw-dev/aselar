import { useState } from 'react';

const usePrintHandler = () => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [receiverName, setReceiverName] = useState<string>('');

  const handlePrint = () => {
    setIsModalOpen(true); 
  };

  const handleModalSubmit = (name: string) => {
    setReceiverName(name); 
    window.print(); 
    setIsModalOpen(false); 
  };

  const handleModalClose = () => {
    setIsModalOpen(false); 
    window.print();
  };

  return {
    isModalOpen,
    receiverName,
    handlePrint,
    handleModalSubmit,
    handleModalClose,
  };
};

export default usePrintHandler;