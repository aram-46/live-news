import React, { useState, useRef } from 'react';
import Draggable from 'react-draggable';
import { CloseIcon, MaximizeIcon, MinimizeIcon } from './icons';

interface DraggableDialogProps {
  url: string;
  onClose: () => void;
}

const DraggableDialog: React.FC<DraggableDialogProps> = ({ url, onClose }) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [size, setSize] = useState({ width: '60vw', height: '70vh' });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const nodeRef = useRef(null);

  const handleMaximize = () => {
    if (isMaximized) {
      setSize({ width: '60vw', height: '70vh' });
    } else {
      setSize({ width: '100vw', height: '100vh' });
      setPosition({x: 0, y: 0});
    }
    setIsMaximized(!isMaximized);
  };

  const dialogStyle: React.CSSProperties = isMaximized ? 
    { width: '100vw', height: '100vh', top: 0, left: 0, transform: 'none', borderRadius: 0, transition: 'all 0.3s ease-in-out' } :
    { width: size.width, height: size.height, transition: 'all 0.3s ease-in-out' };

  if (isMinimized) {
    return (
        <button 
            onClick={() => setIsMinimized(false)}
            className="fixed bottom-4 left-4 z-[100] bg-cyan-600 text-white px-4 py-2 rounded-lg shadow-lg"
        >
            نمایش خبر
        </button>
    );
  }

  return (
    <Draggable
        handle=".handle"
        position={isMaximized ? {x: 0, y: 0} : undefined}
        disabled={isMaximized}
        bounds="parent"
        nodeRef={nodeRef}
    >
      <div 
        ref={nodeRef}
        className="fixed z-[99] bg-gray-900/80 backdrop-blur-md rounded-lg shadow-2xl border border-cyan-400/30 flex flex-col"
        style={dialogStyle}
      >
        <header className="handle h-10 bg-gray-800/50 flex justify-between items-center px-3 cursor-move rounded-t-lg">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="w-5 h-5 rounded-full bg-red-500 hover:bg-red-400"></button>
            <button onClick={() => setIsMinimized(true)} className="w-5 h-5 rounded-full bg-yellow-500 hover:bg-yellow-400"></button>
            <button onClick={handleMaximize} className="w-5 h-5 rounded-full bg-green-500 hover:bg-green-400"></button>
          </div>
          <span className="text-xs text-gray-400 truncate w-1/2 text-center">{url}</span>
          <div className="flex items-center gap-3">
              <button onClick={() => setIsMinimized(true)} className="text-gray-300 hover:text-white"><MinimizeIcon className="w-5 h-5"/></button>
              <button onClick={handleMaximize} className="text-gray-300 hover:text-white"><MaximizeIcon className="w-5 h-5"/></button>
              <button onClick={onClose} className="text-gray-300 hover:text-white"><CloseIcon className="w-5 h-5"/></button>
          </div>
        </header>
        <div className="flex-grow bg-white">
          <iframe
            src={url}
            title="News Content"
            className="w-full h-full border-none"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
    </Draggable>
  );
};

export default DraggableDialog;