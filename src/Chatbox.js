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
  const [uploadedFileUrl, setUploadedFileUrl] = useState(null); // Store uploaded file URL
  const [uploading, setUploading] = useState(false); // State to track upload status
  const textareaRef = useRef(null);
  const socket = useRef(null);

  const connectSocket = () => {
    if (socket.current || isConnected || !inputUserId) return;

    const fetchNgrokUrlAndConnect = async () => {
      try {
        const ngrokResponse = await fetch('https://raw.githubusercontent.com/sprites20/ngrok-links/refs/heads/main/ngrok-link.json');
        const ngrokData = await ngrokResponse.json();
        const ngrokUrl = extractNgrokUrl(ngrokData.ngrok_url);

        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        const ipAddress = ipData.ip;

        const fullUserId = `${new Date().toISOString()}_${inputUserId}_${ipAddress}`;
        setUserId(fullUserId);

        socket.current = io(ngrokUrl, {
          query: { user_id: fullUserId },
          transports: ['websocket']
        });

        setIsConnected(true);

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

  const extractNgrokUrl = (ngrokTunnelString) => {
    const match = ngrokTunnelString.match(/https?:\/\/[^\s]+/);
    if (match) {
      return match[0].replace(/"$/, ''); // Remove any trailing quote
    }
    console.error('No valid ngrok URL found in the response.');
    return null;
  };

  useEffect(() => {
    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, []);

  const handleSendMessage = async () => {
    if (newMessage.trim() === '' && !uploadedFileUrl) return; // Don't send if there's no text or file URL
    if (!isConnected) {
      alert('Please connect to the server first!');
      return;
    }

    const messageToSend = {
      text: newMessage,
      image: uploadedFileUrl, // Use the uploaded file URL if available
      sender: userId,
    };

    // Add the message with the image URL to the chat
    setMessages((prevMessages) => [...prevMessages, messageToSend]);

    // Emit the message to the server
    socket.current.emit('client_event', messageToSend);

    // Reset the message and file state after sending
    setNewMessage(''); // Clear the input field
    setUploadedFileUrl(null); // Reset uploaded file URL
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

    setUploading(true); // Set uploading state to true

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('user_id', userId);

    try {
      const response = await fetch(`${socket.current.io.uri}/upload`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        console.log('File upload response:', result);

        // Store the uploaded file URL
        setUploadedFileUrl(result.file_url);

        alert(`File uploaded successfully: ${selectedFile.name}`);
      } else {
        console.error('Error uploading file:', result.error);
      }
    } catch (error) {
      console.error('File upload failed:', error);
    } finally {
      setUploading(false); // Reset uploading state
      setSelectedFile(null); // Clear the selected file
    }
  };

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

            console.log('Image URL:', message.image); // Log the image URL for debugging

            return (
              <div key={index} className="message">
                <div><strong>{username}</strong>: {message.text}</div> {/* Display just the username */}
                {message.image && (
                  <img
                    src={message.image} // Directly use the image URL
                    alt={"Uploaded image: " + message.image}
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
        <button onClick={handleFileUpload} disabled={uploading}>
          {uploading ? 'Uploading...' : 'Upload File'}
        </button>
      </div>
    </div>
  );
};

export default Chatbox;
