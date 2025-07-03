import axios from 'axios';

// Pour un vrai projet, remplacez par votre endpoint API
const API_URL = 'http://localhost:5000/upload';

export const analyzeDocument = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  // Simulation pour le POC
  /* if (process.env.NODE_ENV === 'development') {
    return mockApiResponse(file.name);
  }

  */

  return axios.post(API_URL, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};

// Fonction de simulation pour le développement
const mockApiResponse = (filename) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        data: {
          summary: "This is a mock summary of the uploaded document.",
          keyPoints: [
            "Important regulatory requirement X",
            "Deadline for compliance: Y date",
            "Main affected business areas: Z"
          ],
          suggestedActions: [
            { action: "Review section 3.2 with legal team", priority: "high" },
            { action: "Update internal policy documents", priority: "medium" }
          ],
          metadata: {
            filename,
            processedAt: new Date().toISOString()
          }
        }
      });
    }, 1500); // Simule un temps de traitement
  });
};