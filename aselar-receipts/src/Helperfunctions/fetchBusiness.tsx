export const fetchBusinesses = async (nature: string) => {
    try {
        const response = await fetch(`/api/search?businessNature=${encodeURIComponent(nature)}`);
        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Fetch error:", error);
        throw error; // Re-throw to handle it in the component
    }
};









//;