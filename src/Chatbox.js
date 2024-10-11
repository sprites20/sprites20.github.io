import React, { useState, useRef, useEffect } from 'react';
import io from 'socket.io-client';
import './Chatbox.css';

const Chatbox = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [userId, setUserId] = useState('');
  const [inputUserId, setInputUserId] = useState('user123');
  const [isConnected, setIsConnected] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedImages, setUploadedImages] = useState([]); // Track uploaded images
  const textareaRef = useRef(null);
  const socket = useRef(null);

  const connectSocket = () => {
    if (socket.current || isConnected || !inputUserId) return;

    const fetchNgrokUrlAndConnect = async () => {
      try {
        // Fetch the ngrok URL from a public GitHub repository
        const ngrokResponse = await fetch('https://raw.githubusercontent.com/sprites20/Spirit-AGI/refs/heads/main/ngrok-link.json');
        const ngrokData = await ngrokResponse.json();

        // Extract the ngrok URL from the data
        const ngrokUrl = 'http://localhost:5000'//extractNgrokUrl(ngrokData.ngrok_url);

        // Fetch the IP address
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        const ipAddress = ipData.ip;

        const fullUserId = `${new Date().toISOString()}_${inputUserId}_${ipAddress}`;
        setUserId(fullUserId);

        // Connect to the socket using the ngrok URL fetched from GitHub
        socket.current = io(ngrokUrl, {
          query: { user_id: fullUserId },
        });

        setIsConnected(true);

        // Listen for server responses
        socket.current.on('server_response', (data) => {
          console.log('Received from server:', data);
          setMessages((prevMessages) => [...prevMessages, data]);
        });

      } catch (error) {
        console.error('Failed to fetch ngrok URL or IP address:', error);
      }
    };

    fetchNgrokUrlAndConnect();
  };

  // Function to extract the ngrok URL
  const extractNgrokUrl = (ngrokTunnelString) => {
    // Use regex to match the URL in the NgrokTunnel string
    const match = ngrokTunnelString.match(/https?:\/\/[^\s]+/);

    if (match) {
      let url = match[0]; // Get the first matched URL

      // Remove the last character if it's a quotation mark
      if (url.endsWith('"')) {
        url = url.slice(0, -1); // Remove the last character
      }

      return url; // Return the cleaned URL
    } else {
      console.error('No valid ngrok URL found in the response.');
      return null; // Or throw an error, depending on your preference
    }
  };

  useEffect(() => {
    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, []);

  const handleSendMessage = async () => {
    if (newMessage.trim() === '') return;
    if (!isConnected) {
      alert('Please connect to the server first!');
      return;
    }

    const messageToSend = {
      text: newMessage,
      image: selectedFile ? `${socket.current.io.uri}/uploads/${selectedFile.name}` : null,
      sender: userId,
    };

    setMessages((prevMessages) => [...prevMessages, messageToSend]);

    // Emit the message with the image URL to the server
    socket.current.emit('client_event', messageToSend);

    if (selectedFile) {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('user_id', userId);

      try {
        const response = await fetch(`${socket.current.io.uri}/upload`, {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          setSelectedFile(null);
        } else {
          console.error('Error uploading file:', await response.json());
        }
      } catch (error) {
        console.error('File upload failed:', error);
      }
    }

    setNewMessage(''); // Clear the input field
    textareaRef.current.style.height = 'auto'; // Reset height
  };

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !isConnected) {
      alert('Please select a file and connect to the server first!');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('user_id', userId);

    try {
      const response = await fetch(`${socket.current.io.uri}/upload`, { // Use backticks for template literals
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        console.log('File upload response:', result);
        alert(`File uploaded successfully: ${selectedFile.name}`);

        // Add the image URL to the messages
        setUploadedImages((prev) => [...prev, result.file_url]); // Track uploaded images
      } else {
        console.error('Error uploading file:', result.error);
      }
    } catch (error) {
      console.error('File upload failed:', error);
    }
  };

  useEffect(() => {
    if (uploadedImages.length > 0) {
      console.log('Uploaded images:', uploadedImages);
    }
  }, [uploadedImages]); // Log when the image URL changes

  return (
    <div className="chatbox">
      <div className="chatbox-header">
        <span>Chatbox</span>
        <input
          type="text"
          value={inputUserId}
          onChange={(e) => setInputUserId(e.target.value)}
          placeholder="Enter your user ID"
          className="user-id-input"
          disabled={isConnected}
        />
        <button onClick={connectSocket} disabled={isConnected || !inputUserId} className="connect-button">
          {isConnected ? 'Connected' : 'Connect'}
        </button>
      </div>
      <div className="chatbox-body">
        <div className="messages">
          {messages.map((message, index) => {
            const senderParts = message.sender.split('_'); // Split the sender string
            const username = senderParts[1]; // Extract the username (user ID) after timestamp

            return (
              <div key={index} className="message">
                <div><strong>{username}</strong>: {message.text}</div> {/* Display just the username */}
                {message.image && (
                  <img
                    src={message.image}
                    alt="Uploaded"
                    className="uploaded-image"
                    style={{ width: '500px', height: 'auto', borderRadius: '5px' }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="chatbox-footer">
        <textarea
          ref={textareaRef}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Type a message..."
          rows="1"
          style={{ resize: 'none' }}
        />
        <button onClick={handleSendMessage}>Send</button>
        <input
          type="file"
          onChange={handleFileChange}
          style={{ marginLeft: '10px' }}
        />
        <button onClick={handleFileUpload}>Upload File</button>
      </div>
    </div>
  );
};

export default Chatbox;
