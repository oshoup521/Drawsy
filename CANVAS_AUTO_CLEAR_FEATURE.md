# Canvas Auto-Clear Feature

## Overview

This feature automatically clears the drawing canvas for all players when a new round starts, ensuring a clean slate for each round of drawing.

## Implementation

### Backend Changes (`drawsy-backend/src/gateways/game.gateway.ts`)

Added automatic canvas clearing in the `handleEndRound` method when transitioning to a new round:

```typescript
// Clear canvas for everyone at the start of a new round
try {
  await this.gameService.clearDrawingData(clientInfo.roomId);
  this.server.to(clientInfo.roomId).emit('clear_canvas');
  console.log(`[END_ROUND] Canvas cleared for new round ${nextDrawerResult.roundNumber}`);
} catch (error) {
  console.error(`[END_ROUND] Failed to clear canvas for new round:`, error);
  // Still broadcast clear canvas event even if database clear fails
  this.server.to(clientInfo.roomId).emit('clear_canvas');
}
```

### How It Works

1. **Round End Detection**: When a round ends and the system determines that another round should start
2. **Database Clearing**: The system clears all stored drawing data for the room from the database
3. **Canvas Clear Event**: A `clear_canvas` event is broadcast to all players in the room
4. **Frontend Response**: All connected clients automatically clear their local canvas when they receive the event

### Benefits

✅ **Automatic**: No manual intervention needed - canvas clears automatically  
✅ **Synchronized**: All players get a clean canvas at the same time  
✅ **Persistent**: Drawing data is also cleared from the database  
✅ **Reliable**: Even if database clearing fails, the UI still gets cleared  
✅ **Logged**: Canvas clearing is logged for debugging purposes

### User Experience

- When a round ends and a new round begins, all players will see their canvas automatically clear
- The new drawer will start with a completely clean canvas
- No leftover drawings from previous rounds will interfere with the new round

### Technical Details

- **Event**: `clear_canvas` is emitted to all players in the room
- **Database**: `gameService.clearDrawingData()` removes persisted drawing data
- **Error Handling**: Canvas still clears on the frontend even if database operation fails
- **Timing**: Clearing happens immediately before the `next_round_started` event is sent

## Testing

To test this feature:

1. Start a game with multiple players
2. Have the drawer draw something on the canvas
3. Wait for the round to end (either by time or correct guess)
4. Observe that when the next round starts, all canvases are automatically cleared
5. Verify the new drawer has a clean canvas to work with

## Files Modified

- `drawsy-backend/src/gateways/game.gateway.ts` - Added automatic canvas clearing logic

## Related Features

- Manual canvas clearing (via clear button) - still works as before
- Round progression system - enhanced with automatic canvas clearing
- Database persistence - drawing data is properly cleaned between rounds
