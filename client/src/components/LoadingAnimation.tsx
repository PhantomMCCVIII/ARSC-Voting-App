import { useEffect, useState } from "react";

export default function LoadingAnimation() {
  const [isVisible, setIsVisible] = useState(true);

  // This effect is for the fade out animation when unmounting
  useEffect(() => {
    return () => {
      setIsVisible(false);
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 bg-white flex flex-col items-center justify-center z-50 ${
        !isVisible ? "animate-fadeOut" : ""
      }`}
      style={{
        animation: !isVisible ? "fadeOut 0.5s forwards" : undefined,
      }}
    >
      <div className="relative mb-4">
        <div 
          className="w-16 h-16 rounded-full border-4 border-[rgba(63,81,181,0.1)] border-t-[#3F51B5]"
          style={{
            animation: "spin 1s linear infinite",
          }}
        ></div>
      </div>
      
      <h2 className="text-xl font-semibold text-[#3F51B5]">ARSC Voting System</h2>
      <p className="text-gray-600 mt-2">Loading...</p>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeOut {
          to { 
            opacity: 0;
            visibility: hidden;
          }
        }
      `}} />
    </div>
  );
}
