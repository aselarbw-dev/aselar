export const formatNumber = (num: number) => {
    if (num === null || num === undefined) return '0.00'; // Handle null or undefined
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};


export const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'BWP',
      minimumFractionDigits: 2
    }).format(amount);
  };
