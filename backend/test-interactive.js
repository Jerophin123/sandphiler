const { io } = require('socket.io-client');

const SERVER_URL = 'http://192.168.21.134:5000';

console.log(`Connecting to compiler server at ${SERVER_URL}...`);
const socket = io(SERVER_URL);

socket.on('connect', () => {
  console.log('Connected! Starting interactive Python execution...');
  
  // Send the execution request
  socket.emit('execute', {
    language: 'python',
    files: [{
      name: 'main.py',
      content: `
import sys
import time

print("--- Start of Interactive Session ---")
sys.stdout.flush()

# First prompt
print("Prompt 1: What is your favorite programming language?")
sys.stdout.flush()
lang = sys.stdin.readline().strip()
print(f"Response received: {lang}")
sys.stdout.flush()

# Second prompt
print("Prompt 2: Enter two numbers separated by space:")
sys.stdout.flush()
nums = sys.stdin.readline().strip().split()
if len(nums) == 2:
    val = int(nums[0]) + int(nums[1])
    print(f"Sum result: {val}")
else:
    print("Invalid input format")
sys.stdout.flush()

print("--- End of Interactive Session ---")
`
    }]
  });
});

socket.on('state_change', (data) => {
  console.log(`[State]: ${data.state}`);
});

socket.on('compile_output', (data) => {
  console.log(`[Compile]: ${data}`);
});

socket.on('stdout', (data) => {
  // Print output to console
  process.stdout.write(data);

  // Auto-respond to interactive questions
  if (data.includes('What is your favorite programming language?')) {
    setTimeout(() => {
      console.log('   -> Sending input: JavaScript');
      socket.emit('stdin', 'JavaScript\n');
    }, 1000);
  } else if (data.includes('Enter two numbers separated by space:')) {
    setTimeout(() => {
      console.log('   -> Sending input: 12 30');
      socket.emit('stdin', '12 30\n');
    }, 1000);
  }
});

socket.on('stderr', (data) => {
  process.stderr.write(`[Error]: ${data}`);
});

socket.on('exit', (details) => {
  console.log(`[Process Exit]: code = ${details.code}, signal = ${details.signal}`);
  socket.disconnect();
});

socket.on('disconnect', () => {
  console.log('Disconnected from server.');
});
