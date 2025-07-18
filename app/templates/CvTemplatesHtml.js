export function getCvHtml_Template1(data = {}, options = {}) {
  // Déstructuration et fallback des données
  const {
    nom = "OLIVIA", prenom = "WILSON", poste = "GRAPHIC DESIGNER",
    photoUrl = "", accroche = "", contact = {},
    competences = [], savoirEtre = [], experiences = [], formations = [],
    interets = [], langues = []
  } = data;

  // Couleurs
  const mainColor = options.mainColor || "#1DFFC2";
  const accentColor = options.accentColor || "#297F6D";
  const bgColor = options.bgColor || "#e8fdf6";

  return `
  <html>
  <head>
    <meta charset="UTF-8" />
    <link href="https://fonts.googleapis.com/css?family=Montserrat:700,900|Montserrat:400,700&display=swap" rel="stylesheet">
    <style>
      body {
        background: ${bgColor}; margin: 0; padding: 0;
        font-family: 'Montserrat', Arial, sans-serif;
      }
      .cv-wrapper {
        max-width: 850px; min-height: 1200px;
        margin: 40px auto; background: #fff;
        border-radius: 32px; box-shadow: 0 10px 48px #0001;
        display: flex; flex-direction: row; overflow: hidden;
      }
      .sidebar {
        width: 240px; background: linear-gradient(180deg, ${mainColor} 0%, #68efd7 100%);
        color: #fff; padding: 40px 22px; display: flex; flex-direction: column; align-items: center;
      }
      .avatar {
        width: 110px; height: 110px; border-radius: 50%; background: #fff; margin-bottom: 18px;
        box-shadow: 0 4px 16px #0002; overflow: hidden; display: flex; align-items: center; justify-content: center;
      }
      .avatar img { width: 100%; height: 100%; object-fit: cover; }
      .profile-name { font-size: 36px; font-weight: 900; letter-spacing: 2px; color: #fff; text-align: center; margin-bottom: 6px; }
      .profile-role { font-size: 17px; font-weight: 700; text-transform: uppercase; opacity: 0.95; color: #fff; margin-bottom: 14px; letter-spacing: 2px; }
      .sidebar-section { margin-bottom: 22px; width: 100%; }
      .sidebar-title { font-size: 14px; font-weight: 700; letter-spacing: 1px; margin-bottom: 7px; text-transform: uppercase; border-bottom: 2px solid #fff7; padding-bottom: 3px; opacity: 0.85; }
      .sidebar-content { font-size: 13.4px; line-height: 1.6; }
      .main { flex: 1; padding: 54px 48px 42px 40px; }
      .main-section { margin-bottom: 36px; }
      .main-title { font-size: 17px; font-weight: 800; color: ${mainColor}; text-transform: uppercase; letter-spacing: 1.2px; border-bottom: 2px solid #e7fff9; margin-bottom: 12px; padding-bottom: 4px; }
      .exp-bloc { margin-bottom: 16px; }
      .exp-title { font-weight: 700; font-size: 15.5px; color: ${accentColor}; margin-bottom: 3px; }
      .exp-date { color: #888; font-size: 13.4px; margin-left: 7px; }
      .exp-desc { color: #232323; font-size: 14px; }
      .skills-badge { display: inline-block; background: #fff2; border-radius: 14px; padding: 6px 12px; font-weight: 600; font-size: 13px; margin: 3px 2px 2px 0; }
    </style>
  </head>
  <body>
    <div class="cv-wrapper">
      <div class="sidebar">
        <div class="avatar">
          ${photoUrl ? `<img src="${photoUrl}" alt="Photo">` : '<span style="font-size:54px;">👤</span>'}
        </div>
        <div class="profile-name">${prenom} <br>${nom}</div>
        <div class="profile-role">${poste}</div>
        <div class="sidebar-section">
          <div class="sidebar-title">Contact</div>
          <div class="sidebar-content">
            ${contact.tel ? `📞 ${contact.tel}<br>` : ''}
            ${contact.email ? `✉️ ${contact.email}<br>` : ''}
            ${contact.adresse ? `🏠 ${contact.adresse}<br>` : ''}
          </div>
        </div>
        ${langues.length ? `
        <div class="sidebar-section">
          <div class="sidebar-title">Langues</div>
          <div class="sidebar-content">${langues.map(l => `<span class="skills-badge">${l}</span>`).join(' ')}</div>
        </div>
        ` : ''}
        ${competences.length ? `
        <div class="sidebar-section">
          <div class="sidebar-title">Compétences</div>
          <div class="sidebar-content">${competences.map(c => `<span class="skills-badge">${c}</span>`).join(' ')}</div>
        </div>
        ` : ''}
        ${interets.length ? `
        <div class="sidebar-section">
          <div class="sidebar-title">Centres d’intérêt</div>
          <div class="sidebar-content">${interets.map(i => `<span class="skills-badge">${i}</span>`).join(' ')}</div>
        </div>
        ` : ''}
      </div>
      <div class="main">
        ${accroche ? `<div style="font-style:italic; color:#888; margin-bottom:30px;">${accroche}</div>` : ''}
        <div class="main-section">
          <div class="main-title">Expérience</div>
          ${
            Array.isArray(experiences) && experiences.length ?
              experiences.map(exp => `
                <div class="exp-bloc">
                  <div class="exp-title">${exp.titre || exp.poste || ''}<span class="exp-date">${exp.date || ''}</span></div>
                  ${exp.entreprise ? `<div style="font-size:13px;color:#666;margin-bottom:2px;">${exp.entreprise}</div>` : ''}
                  <div class="exp-desc">${exp.description || ''}</div>
                </div>
              `).join('') : '<div>Aucune expérience renseignée.</div>'
          }
        </div>
        <div class="main-section">
          <div class="main-title">Formation</div>
          ${
            Array.isArray(formations) && formations.length ?
              formations.map(form => `
                <div class="exp-bloc">
                  <div class="exp-title">${form.titre || ''}<span class="exp-date">${form.date || ''}</span></div>
                  ${form.ecole ? `<div style="font-size:13px;color:#666;margin-bottom:2px;">${form.ecole}</div>` : ''}
                </div>
              `).join('') : '<div>Aucune formation renseignée.</div>'
          }
        </div>
        <div class="main-section">
          <div class="main-title">Savoirs-être</div>
          <div>
            ${Array.isArray(savoirEtre) && savoirEtre.length ? savoirEtre.map(s => `<span class="skills-badge">${s}</span>`).join(' ') : 'Aucun savoir-être renseigné.'}
          </div>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;
}

  
