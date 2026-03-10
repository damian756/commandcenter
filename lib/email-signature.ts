export function getEmailSignature(): string {
  return `
<div style="margin-top:32px;padding-top:20px;border-top:1px solid #e5e7eb;font-family:Arial,Helvetica,sans-serif;max-width:520px;">
  <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;">
    <tr>
      <td style="vertical-align:top;padding-right:14px;width:60px;">
        <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <tr>
            <td style="width:56px;height:56px;background-color:#0f172a;border-radius:50%;text-align:center;vertical-align:middle;">
              <span style="color:#ffffff;font-size:18px;font-weight:bold;font-family:Arial,Helvetica,sans-serif;letter-spacing:-1px;">CM</span>
            </td>
          </tr>
        </table>
      </td>
      <td style="vertical-align:top;">
        <p style="margin:0 0 2px 0;font-size:17px;font-weight:bold;color:#0f172a;font-family:Arial,Helvetica,sans-serif;">Damian Roche</p>
        <p style="margin:0;font-size:11px;font-weight:600;color:#dc2626;letter-spacing:1.5px;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">Director &nbsp;&bull;&nbsp; Churchtown Media</p>
      </td>
    </tr>
  </table>

  <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:12px;width:100%;">
    <tr>
      <td style="padding-right:24px;padding-bottom:4px;white-space:nowrap;">
        <a href="mailto:damian@churchtownmedia.co.uk" style="color:#374151;text-decoration:none;font-size:13px;font-family:Arial,Helvetica,sans-serif;">
          <span style="margin-right:5px;">&#9993;</span>damian@churchtownmedia.co.uk
        </a>
      </td>
      <td style="padding-bottom:4px;white-space:nowrap;">
        <a href="https://churchtownmedia.co.uk" style="color:#374151;text-decoration:none;font-size:13px;font-family:Arial,Helvetica,sans-serif;">
          <span style="margin-right:5px;">&#127760;</span>churchtownmedia.co.uk
        </a>
      </td>
    </tr>
    <tr>
      <td style="padding-right:24px;white-space:nowrap;">
        <a href="tel:01704635785" style="color:#374151;text-decoration:none;font-size:13px;font-family:Arial,Helvetica,sans-serif;">
          <span style="margin-right:5px;">&#128222;</span>01704 635785
        </a>
      </td>
      <td style="white-space:nowrap;">
        <span style="color:#374151;font-size:13px;font-family:Arial,Helvetica,sans-serif;">
          <span style="margin-right:5px;">&#128205;</span>Southport, PR9 9SA
        </span>
      </td>
    </tr>
  </table>

  <p style="margin:10px 0 0 0;font-size:11px;color:#9ca3af;font-family:Arial,Helvetica,sans-serif;">
    Churchtown Media Ltd &nbsp;&bull;&nbsp; Co. No. 16960442 &nbsp;&bull;&nbsp; VAT No. 511024262
  </p>

  <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:12px;">
    <tr>
      <td style="padding-right:2px;">
        <p style="margin:0 0 6px 0;font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:1.5px;font-family:Arial,Helvetica,sans-serif;">Sefton Coast Network</p>
      </td>
    </tr>
    <tr>
      <td>
        <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <tr>
            <td style="padding-right:5px;">
              <a href="https://southportguide.co.uk" style="display:inline-block;background-color:#0f172a;text-decoration:none;padding:5px 12px;border-radius:4px;font-size:12px;font-weight:600;font-family:Arial,Helvetica,sans-serif;">
                <span style="color:#ffffff;">Southport</span><span style="color:#ef4444;">Guide</span>
              </a>
            </td>
            <td style="padding-right:5px;">
              <a href="https://formbyguide.co.uk" style="display:inline-block;background-color:#0f172a;text-decoration:none;padding:5px 12px;border-radius:4px;font-size:12px;font-weight:600;font-family:Arial,Helvetica,sans-serif;">
                <span style="color:#ffffff;">Formby</span><span style="color:#ef4444;">Guide</span>
              </a>
            </td>
            <td style="padding-right:5px;">
              <a href="https://seftonlinks.com" style="display:inline-block;background-color:#0f172a;text-decoration:none;padding:5px 12px;border-radius:4px;font-size:12px;font-weight:600;font-family:Arial,Helvetica,sans-serif;">
                <span style="color:#ffffff;">Sefton</span><span style="color:#ef4444;">Links</span>
              </a>
            </td>
            <td>
              <a href="https://seftoncoastwildlife.co.uk" style="display:inline-block;background-color:#0f172a;text-decoration:none;padding:5px 12px;border-radius:4px;font-size:12px;font-weight:600;font-family:Arial,Helvetica,sans-serif;">
                <span style="color:#ffffff;">Sefton Coast</span><span style="color:#ef4444;">Wildlife</span>
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
`;
}
