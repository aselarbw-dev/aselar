

{/*import React, { useState, useEffect, useRef, useMemo } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import styles from "./Scanner.module.css";
import TotalDisplay from "./TotalDisplay";
import { toast } from "react-toastify";

const Scanner: React.FC = () => {
  const [decodedResult, setDecodedResult] = useState<string | null | number>(null);
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [productDetails, setProductDetails] = useState({
    name: "",
    price: "",
    cost: "",
    quantity: "",
    category: "",
    purchaseDate: "",
    expiryDate: "",
  });
  const [scannedProducts, setScannedProducts] = useState<any[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products-with-scanner",{
        credentials: 'include',
      });
      if (response.ok) {
        const products = await response.json();

        const normalizedProducts = products.map((product: any) => ({
          ...product,
          price: parseFloat(product.price),
          cost: parseFloat(product.cost),
          quantity: parseInt(product.quantity),
        }));

        setScannedProducts(normalizedProducts);
        toast.success("Products loaded successfully.");
      } else {
        toast.error("Failed to fetch products from the backend.");
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("An error occurred while fetching products.");
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleScanResult = (data: string) => {
    setDecodedResult(data);
    setFormVisible(true);
  };

  const startScanner = () => {
    if (!scannerRef.current) {
      const scanner = new Html5QrcodeScanner("scanner", { fps: 10, qrbox: 250 }, true);
      scannerRef.current = scanner;
      scanner.render(handleScanResult, (error: any) => console.error("Error scanning:", error));
    }
    toast.success("Scanner was launched.");
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
    }
    toast.warning("Scanner was closed.");
  };

  const takeScreenshot = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (context) {
        const videoElement = document.querySelector("video");
        if (videoElement) {
          context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          const imageUrl = canvas.toDataURL("image/png");
          setScannedImage(imageUrl);
        }
      }
      toast.success("Screenshot taken");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newProduct = {
      ...productDetails,
      price: parseFloat(productDetails.price),
      cost: parseFloat(productDetails.cost),
      quantity: parseInt(productDetails.quantity),
      category: productDetails.category,
      barcode: decodedResult,
      purchaseDate: productDetails.purchaseDate,
      expiryDate: productDetails.expiryDate,
    };

    try {
      const response = await fetch("/api/products-with-scanner", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          credentials: "include",
        },
        body: JSON.stringify(newProduct),
      });

      if (response.ok) {
        toast.success("Product submitted successfully!");
        fetchProducts(); // Refresh the product list
      } else {
        const errorData = await response.json();
        toast.error(`Error: ${errorData.message || "Failed to submit product"}`);
      }
    } catch (error) {
      console.error("Error submitting product:", error);
      toast.error("Failed to submit product. Please try again later.");
    }

    setFormVisible(false);
    setDecodedResult(null);
    setScannedImage(null);
    setProductDetails({
      name: "",
      price: "",
      cost: "",
      quantity: "",
      category: "",
      purchaseDate: "",
      expiryDate: "",
    });
  };

  const { totalSales, totalCost, totalProfits, totalQuantity } = useMemo(() => {
    const totalSales = scannedProducts.reduce(
      (acc, product) => acc + (product.price || 0) * (product.quantity || 0),
      0
    );
    const totalCost = scannedProducts.reduce(
      (acc, product) => acc + (product.cost || 0) * (product.quantity || 0),
      0
    );
    const totalQuantity = scannedProducts.reduce(
      (acc, product) => acc + (product.quantity || 0),
      0
    );
    const totalProfits = totalSales - totalCost;

    return { totalSales, totalCost, totalProfits, totalQuantity };
  }, [scannedProducts]);

  const handleEdit = async (id: string) => {
  const updatedProduct={...productDetails}
    
    console.log("editing product with ID:",id); 
   const URL="/api/products-with-scanner/"
    try {
      const response = await fetch(`${URL}${id}`, {
        method: "PUT",
          credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedProduct),
      });

      if (response.ok) {
        toast.success("Product updated successfully!");
        fetchProducts(); // Refresh the product list
      } else {
        const errorData = await response.json();
        toast.error(`Error: ${errorData.message || "Failed to update product"}`);
      }
    } catch (error) {
      console.error("Error editing product:", error);
      toast.error("Failed to edit product. Please try again later.");
    }
  };

  const handleDelete = async (_id: string) => {
    try {
      const response = await fetch(`/api/products-with-scanner/${_id}`, {
        method: "DELETE",
        credentials:'include'
      });

      if (response.ok) {
        toast.success("Product deleted successfully!");
        setScannedProducts((prevProducts) =>
          prevProducts.filter((product) => product._id !== _id)
        );
      } else {
        const errorData = await response.json();
        toast.error(`Error: ${errorData.message || "Failed to delete product"}`);
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product. Please try again later.");
    }
  };

  return (
    <div className={styles.container}>
      <TotalDisplay
        totalSales={totalSales}
        totalCost={totalCost}
        totalProfits={totalProfits}
        totalQuantity={totalQuantity}
      />

      <div className={styles.buttons}>
        <button onClick={startScanner} className={styles.scannerBtn}>Start Scanner</button>
        <button className={styles.stop} onClick={stopScanner}>
          Stop Scanner
        </button>
        <button className={styles.capture} onClick={takeScreenshot}>
          Capture Screenshot
        </button>
      </div>

      <div id="scanner" className={styles.scanner}></div>

      {formVisible && (
        <form onSubmit={handleSubmit}  className={styles.mainForm}>
        
          <div>
            <label>Name:</label>
            <input
              type="text"
              value={productDetails.name}
              onChange={(e) => setProductDetails({ ...productDetails, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label>Price:</label>
            <input
              type="number"
              step="0.01"
              value={productDetails.price}
              onChange={(e) => setProductDetails({ ...productDetails, price: e.target.value })}
              required
            />
          </div>
          <div>
            <label>Cost:</label>
            <input
              type="number"
              step="0.01"
              value={productDetails.cost}
              onChange={(e) => setProductDetails({ ...productDetails, cost: e.target.value })}
              required
            />
          </div>
          <div>
            <label>Quantity:</label>
            <input
              type="number"
              value={productDetails.quantity}
              onChange={(e) => setProductDetails({ ...productDetails, quantity: e.target.value })}
              required
            />
          </div>
          <div>
            <label>Category:</label>
            <input
              type="text"
              value={productDetails.category}
              onChange={(e) => setProductDetails({ ...productDetails, category: e.target.value })}
              required
            />
          </div>
          <div>
            <label>Purchase Date:</label>
            <input
              type="date"
              value={productDetails.purchaseDate}
              onChange={(e) =>
                setProductDetails({ ...productDetails, purchaseDate: e.target.value })
              }
              required
            />
          </div>
          <div>
            <label>Expiry Date:</label>
            <input
              type="date"
              value={productDetails.expiryDate}
              onChange={(e) =>
                setProductDetails({ ...productDetails, expiryDate: e.target.value })
              }
              required
            />
          </div>
          <button type="submit">Submit</button>
        </form>
      )}

      <div className={styles.productGrid}>
        {scannedProducts.map((product) => (
          <div key={product._id} className={styles.productCard}>
            <h4>Product Details</h4>
           
            <div>
            <strong>Name:</strong> {product.name}
          </div>
          <div>
            <strong>Price:</strong> P{product.price.toFixed(2)}
          </div>
          <div>
            <strong>Cost:</strong> P{product.cost.toFixed(2)}
          </div>
          <div>
            <strong>Quantity:</strong> {product.quantity}
          </div>
          <div>
            <strong>Category:</strong> {product.category}
          </div>
          <div>
            <strong>Purchase Date:</strong> {product.purchaseDate}
          </div>
          <div>
            <strong>Expiry Date:</strong> {product.expiryDate}
          </div>
          {product.barcode && (
            <div>
              <strong>Scanned QR Code:</strong>
              <p>{product.barcode}</p>
            </div>
          )}
           {product.image && (
            <img src={product.image} alt="Captured QR/Barcode" />
          )}
            <div className={styles.Buttons}>
              <button
                onClick={() => handleEdit(product._id)}
                className={styles.editButton}
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(product._id)}
                className={styles.deleteButton}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }}></canvas>
    </div>
  );
};

export default Scanner;
*/}