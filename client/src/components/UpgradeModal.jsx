import { DiamondMark } from "./Logo";

// Upgrade — paid plan abhi tayyar nahi.
// Price ka elaan baad mein hoga: is screen par KAHIN bhi koi price,
// plan ka naam ya payment method nahi likha. Sirf WhatsApp rabta.
const WHATSAPP_URL =
  "https://wa.me/923039929254?text=" +
  encodeURIComponent(
    "Assalam o Alaikum! Main Tech AI Assistant ka paid plan (Upgrade) lena chahta hoon. Tafseel bata dein."
  );

export default function UpgradeModal({ onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <DiamondMark size={44} />
        <h2>Upgrade — jald aa raha hai</h2>
        <p>
          Paid plan jald aa raha hai — is se aap be-rok-tok chat kar sakein
          ge, bina roz ki free limit ke.
        </p>
        <p>
          Price ka elaan jald hoga. Tab tak free plan use karein — roz naye
          free tokens milte hain.
        </p>
        <a
          className="btn-primary btn-block modal-whatsapp"
          href={WHATSAPP_URL}
          target="_blank"
          rel="noreferrer"
        >
          WhatsApp par rabta karein
        </a>
        <button
          type="button"
          className="btn-ghost btn-block"
          onClick={onClose}
        >
          Band karein
        </button>
        <p className="auth-foot">Tech AI Assistant by Asad Tech</p>
      </div>
    </div>
  );
}
