const proxyUrl = "http://localhost:3000"; // Proxyserver om CORS-problemen te vermijden

// 📌 Functie om een model aan te maken via de backend
const createModel = async (imageBase64) => {
  const formData = new FormData();
  formData.append('image', imageBase64);

  try {
      const response = await axios.post('http://localhost:3000/api/generateModel', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data.taskId;  // retourneer de taskId
  } catch (error) {
      console.error('Error creating model:', error);
      throw error;
  }
};


// 📌 Functie om de modelstatus op te halen van de backend
const getModelStatus = async (taskId) => {
    try {
        console.log(`🔄 Ophalen van status voor task ID: ${taskId}...`);
        
        const response = await axios.get(`${proxyUrl}/api/getModel/${taskId}`);

        console.log("📊 Status update ontvangen:", response.data);
        return response.data;
    } catch (error) {
        console.error("❌ Fout bij ophalen van modelstatus:", error);
        throw error;
    }
};

export { createModel, getModelStatus };
