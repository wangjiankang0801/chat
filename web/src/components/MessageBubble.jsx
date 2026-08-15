import { isImageAvatar } from "../lib/image.js";

export default function MessageBubble({ message, avatar }) {
  const isUser = message.role === "user";

  return (
    <div className={isUser ? "msg-row user" : "msg-row bot"}>
      {!isUser && (
        <div className="msg-avatar">
          {isImageAvatar(avatar) ? <img src={avatar} alt="" className="msg-avatar-img" /> : (avatar || "🤖")}
        </div>
      )}
      <div className={message.meta ? "msg-bubble meta" : "msg-bubble"}>
        {message.sticker && (
          <div className="msg-sticker">{message.sticker}</div>
        )}
        {message.images?.length > 0 && (
          <div className="msg-images">
            {message.images.map((src) => (
              <img key={src.slice(0, 40)} src={src} alt="图片" className="msg-img" />
            ))}
          </div>
        )}
        {message.content && <div className="msg-text">{message.content}</div>}
        {message.ts && (
          <div className="msg-time">{new Date(message.ts).toLocaleString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</div>
        )}
      </div>
      {isUser && <div className="msg-avatar user">我</div>}
    </div>
  );
}