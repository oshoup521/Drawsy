#!/bin/bash

# Script to start ngrok tunnels for Drawsy services
# Make sure ngrok is installed and authenticated

echo "Starting ngrok tunnels for Drawsy services..."

# Start ngrok tunnel for backend (port 3000)
echo "Starting backend tunnel (port 3000)..."
ngrok http 3000 --log=stdout > ngrok-backend.log 2>&1 &
BACKEND_PID=$!

# Wait a moment for the tunnel to establish
sleep 3

# Start ngrok tunnel for LLM service (port 8000)
echo "Starting LLM service tunnel (port 8000)..."
ngrok http 8000 --log=stdout > ngrok-llm.log 2>&1 &
LLM_PID=$!

# Wait a moment for the tunnel to establish
sleep 3

echo "Ngrok tunnels started!"
echo "Backend PID: $BACKEND_PID"
echo "LLM Service PID: $LLM_PID"
echo ""
echo "Check your tunnel URLs:"
echo "Backend log: tail -f ngrok-backend.log"
echo "LLM Service log: tail -f ngrok-llm.log"
echo ""
echo "Or visit: http://localhost:4040 to see all active tunnels"
echo ""
echo "To stop tunnels:"
echo "kill $BACKEND_PID $LLM_PID"

# Save PIDs to file for easy cleanup
echo "$BACKEND_PID $LLM_PID" > ngrok-pids.txt