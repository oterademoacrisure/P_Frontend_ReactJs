import { Link } from 'react-router-dom';

export default function Header({ username, onLogout, isAdmin }) {
  return (
    <div className="titleblock">
      <div className="tb-top">
        <div className="tb-brand">
          <div className="tb-titlewrap">
            <div className="tb-title">BA Assist - Payment Integrity</div>
          </div>
          <div className="tb-right">
            {onLogout && (
              <div className="tb-user">
                {username && <span className="tb-username">{username}</span>}
                {isAdmin && (
                  <Link to="/admin/register" className="tb-admin">
                    Admin
                  </Link>
                )}
                <button type="button" className="tb-logout" onClick={onLogout}>
                  Sign out
                </button>
              </div>
            )}
            <svg className="tb-logo" viewBox="0 0 600 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="PayerIQ logo">
            <g transform="translate(24,22) scale(0.4875) translate(-311.4,-10)">
              <polygon points="450,330 588.6,250 588.6,90 450,170" fill="#001E3C" />
              <polygon points="453.7,323.6 492.5,301.2 492.5,256.4 453.7,278.8" fill="#4A90D9" />
              <polygon points="499.9,296.9 538.7,274.5 538.7,229.7 499.9,252.1" fill="#6BAEE8" />
              <polygon points="546.1,270.3 584.9,247.9 584.9,203.1 546.1,225.5" fill="#F0F6FF" />
              <polygon points="453.7,270.3 492.5,247.9 492.5,203.1 453.7,225.5" fill="#4A90D9" />
              <polygon points="499.9,243.6 538.7,221.2 538.7,176.4 499.9,198.8" fill="#6BAEE8" />
              <polygon points="546.1,216.9 584.9,194.5 584.9,149.7 546.1,172.1" fill="#4A90D9" />
              <polygon points="453.7,216.9 492.5,194.5 492.5,149.7 453.7,172.1" fill="#F0F6FF" />
              <polygon points="499.9,190.3 538.7,167.9 538.7,123.1 499.9,145.5" fill="#00C8E8" />
              <polygon points="546.1,163.6 584.9,141.2 584.9,96.4 546.1,118.8" fill="#4A90D9" />
              <polygon points="450,330 311.4,250 311.4,90 450,170" fill="#001E3C" />
              <polygon points="446.3,323.6 407.5,301.2 407.5,256.4 446.3,278.8" fill="#00C8E8" />
              <polygon points="400.1,296.9 361.3,274.5 361.3,229.7 400.1,252.1" fill="#F0F6FF" />
              <polygon points="353.9,270.3 315.1,247.9 315.1,203.1 353.9,225.5" fill="#00A9CE" />
              <polygon points="446.3,270.3 407.5,247.9 407.5,203.1 446.3,225.5" fill="#00C8E8" />
              <polygon points="400.1,243.6 361.3,221.2 361.3,176.4 400.1,198.8" fill="#00A9CE" />
              <polygon points="353.9,216.9 315.1,194.5 315.1,149.7 353.9,172.1" fill="#F0F6FF" />
              <polygon points="446.3,216.9 407.5,194.5 407.5,149.7 446.3,172.1" fill="#00C8E8" />
              <polygon points="400.1,190.3 361.3,167.9 361.3,123.1 400.1,145.5" fill="#4A90D9" />
              <polygon points="353.9,163.6 315.1,141.2 315.1,96.4 353.9,118.8" fill="#00A9CE" />
              <polygon points="450,10 588.6,90 450,170 311.4,90" fill="#001E3C" />
              <polygon points="450,14.3 488.8,36.7 450,59.1 411.2,36.7" fill="#F0F6FF" />
              <polygon points="496.2,40.9 535,63.3 496.2,85.7 457.4,63.3" fill="#8B1A2A" />
              <polygon points="542.4,67.6 581.2,90 542.4,112.4 503.6,90" fill="#F0F6FF" />
              <polygon points="403.8,40.9 442.6,63.3 403.8,85.7 365,63.3" fill="#D0E4F8" />
              <polygon points="450,67.6 488.8,90 450,112.4 411.2,90" fill="#F0F6FF" />
              <polygon points="496.2,94.3 535,116.7 496.2,139.1 457.4,116.7" fill="#00C8E8" />
              <polygon points="357.6,67.6 396.4,90 357.6,112.4 318.8,90" fill="#8B1A2A" />
              <polygon points="403.8,94.3 442.6,116.7 403.8,139.1 365,116.7" fill="#D0E4F8" />
              <polygon points="450,120.9 488.8,143.3 450,165.7 411.2,143.3" fill="#F0F6FF" />
              <polyline points="450,330 588.6,250 588.6,90 450,170" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="1" strokeLinejoin="round" />
              <polyline points="450,330 311.4,250 311.4,90 450,170" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="1" strokeLinejoin="round" />
              <line x1="450" y1="10" x2="588.6" y2="90" stroke="rgba(255,255,255,.55)" strokeWidth="1" />
              <line x1="450" y1="10" x2="311.4" y2="90" stroke="rgba(255,255,255,.55)" strokeWidth="1" />
              <polyline points="588.6,90 450,170 311.4,90" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="1" />
              <line x1="450" y1="330" x2="450" y2="170" stroke="rgba(255,255,255,.65)" strokeWidth="1" />
            </g>
            <text x="200" y="108" fontFamily="'Aptos','Aptos Display','Segoe UI',system-ui,-apple-system,sans-serif" fontSize="66" fontWeight="800" letterSpacing="-2">
              <tspan fill="#FFFFFF">Payer</tspan>
              <tspan fill="#36C0CF">IQ</tspan>
            </text>
            <text x="202" y="140" fontFamily="'Aptos','Aptos Display','Segoe UI',system-ui,-apple-system,sans-serif" fontSize="14.5" fontWeight="700" letterSpacing="2.2" fill="#CFE8FF">
              AI-ASSISTED CONSULTING · COGNIZANT
            </text>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
