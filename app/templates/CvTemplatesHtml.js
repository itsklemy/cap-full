// /app/templates/CvTemplatesHtml.js

export function getCvHtml_CanvaPremium(cvData = {}) {
    const {
      prenom = '', nom = '', poste = '', accroche = '', photoUrl = '',
      contact = {}, competences = [], savoirEtre = [], experiences = [],
      formations = [], interets = [], langues = [], qualites = []
    } = cvData;
  
    return `
    <html>
    <head>
      <meta charset="UTF-8" />
      <style>
        body {
          margin: 0;
          padding: 0;
          background: #e8fdf6;
        }
        .cv-container {
          display: flex;
          flex-direction: row;
          max-width: 850px;
          min-height: 1200px;
          margin: 40px auto;
          background: #fff;
          border-radius: 32px;
          box-shadow: 0 10px 48px #0001;
          overflow: hidden;
          font-family: 'Segoe UI', Arial, sans-serif;
        }
        .cv-sidebar {
          background: linear-gradient(180deg, #1DFFC2 0%, #68efd7 100%);
          width: 230px;
          min-width: 200px;
          color: #fff;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 36px 18px 36px 18px;
          position: relative;
        }
        .cv-sidebar .avatar {
          width: 110px; height: 110px;
          border-radius: 50%;
          background: #fff;
          margin-bottom: 18px;
          box-shadow: 0 4px 16px #0002;
          display: flex;
          align-items: center; justify-content: center;
          font-size: 52px; color: #1DFFC2;
          overflow: hidden;
        }
        .cv-sidebar .section {
          margin-top: 18px;
          margin-bottom: 12px;
          width: 100%;
        }
        .cv-sidebar .section-title {
          font-weight: 700;
          font-size: 14px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          border-bottom: 2px solid #fff8;
          padding-bottom: 3px;
          margin-bottom: 7px;
          opacity: 0.85;
        }
        .cv-sidebar .section-content {
          font-size: 13.2px;
          margin-bottom: 8px;
        }
        .cv-sidebar .dot {
          width: 11px; height: 11px; border-radius: 50%; background: #fff7; margin: 8px auto;
        }
        .cv-main {
          flex: 1;
          padding: 48px 52px 42px 36px;
          position: relative;
          background: #fff;
          border-top-left-radius: 62px;
        }
        .cv-main .name {
          font-size: 36px; font-weight: 900; color: #1DFFC2; letter-spacing: 1.5px;
        }
        .cv-main .role {
          font-size: 22px; font-weight: 700; color: #19b999; margin-bottom: 6px;
          letter-spacing: 0.5px;
        }
        .cv-main .catchline {
          font-size: 16px; font-style: italic; color: #555; margin-bottom: 20px;
          opacity: 0.85;
        }
        .cv-main .section-title {
          color: #1DFFC2;
          font-weight: 800;
          font-size: 17px;
          letter-spacing: 1.2px;
          margin-top: 30px;
          margin-bottom: 10px;
          border-bottom: 2px solid #e7fff9;
          padding-bottom: 4px;
          text-transform: uppercase;
        }
        .cv-main .section-content {
          font-size: 15px;
          color: #222;
          margin-bottom: 18px;
          line-height: 1.7;
        }
        /* Responsive : impression/export */
        @media print {
          .cv-container { box-shadow: none; margin: 0; }
        }
      </style>
    </head>
    <body>
      <div class="cv-container">
        <div class="cv-sidebar">
          <!-- Avatar (photo) -->
          <div class="avatar">
            ${photoUrl ? `<img src="${photoUrl}" alt="Photo" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />` : '<span>👤</span>'}
          </div>
          <!-- Coordonnées -->
          <div class="section">
            <div class="section-title">Coordonnées</div>
            <div class="section-content">
              ${contact.tel ? contact.tel + '<br>' : ''}
              ${contact.email ? contact.email + '<br>' : ''}
              ${contact.adresse ? contact.adresse : ''}
            </div>
          </div>
          <div class="dot"></div>
          <!-- Langues -->
          ${langues?.length ? `
            <div class="section">
              <div class="section-title">Langues</div>
              <div class="section-content">
                ${langues.map(l => l).join('<br>')}
              </div>
            </div>
            <div class="dot"></div>
          ` : ''}
          <!-- Qualités -->
          ${qualites?.length ? `
            <div class="section">
              <div class="section-title">Qualités</div>
              <div class="section-content">
                ${qualites.map(q => q).join('<br>')}
              </div>
            </div>
            <div class="dot"></div>
          ` : ''}
          <!-- Compétences -->
          ${competences?.length ? `
            <div class="section">
              <div class="section-title">Compétences</div>
              <div class="section-content">
                ${competences.map(c => c).join('<br>')}
              </div>
            </div>
            <div class="dot"></div>
          ` : ''}
          <!-- Centres d’intérêt -->
          ${interets?.length ? `
            <div class="section">
              <div class="section-title">Centres d’intérêt</div>
              <div class="section-content">
                ${interets.map(c => c).join(', ')}
              </div>
            </div>
          ` : ''}
        </div>
        <div class="cv-main">
          <div class="name">${prenom} ${nom}</div>
          <div class="role">${poste}</div>
          <div class="catchline">${accroche}</div>
          <div class="section-title">Expériences Professionnelles</div>
          <div class="section-content">
            ${
              Array.isArray(experiences) && experiences.length ?
              experiences.map(exp => `
                <div>
                  <b>${exp.titre || exp.poste || ''}</b> (${exp.date || ''})<br>
                  ${exp.entreprise ? `<i>${exp.entreprise}</i><br>` : ''}
                  ${exp.description || ''}
                </div>
              `).join('<br>') : '<div>Aucune expérience renseignée.</div>'
            }
          </div>
          <div class="section-title">Formations</div>
          <div class="section-content">
            ${
              Array.isArray(formations) && formations.length ?
              formations.map(form => `
                <div>
                  <b>${form.titre || ''}</b> (${form.date || ''})<br>
                  <i>${form.ecole || ''}</i>
                </div>
              `).join('<br>') : '<div>Aucune formation renseignée.</div>'
            }
          </div>
          <div class="section-title">Savoirs-être</div>
          <div class="section-content">
            ${Array.isArray(savoirEtre) && savoirEtre.length ?
              savoirEtre.map(s => s).join(', ') :
              '<div>Aucun savoir-être renseigné.</div>'}
          </div>
        </div>
      </div>
    </body>
    </html>
    `;
  }
  