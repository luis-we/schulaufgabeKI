from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

origins = [
    "http://localhost:3333",
    "http://127.0.0.1:3333",
    "http://localhost:8080"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

class Data(BaseModel):
    state: int
    

@app.post("/prediction")
async def controllServo(data: Data):
    connectionSuccess = await checkConnection()
    
    if(connectionSuccess):
        # Implement Arduino controlls

        print(data.state)

    return connectionSuccess
    

@app.post("/connect")
async def checkConnection():
    # Check if arduino is connected and return true or false

    return True