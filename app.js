const sidebarBtn = document.getElementById("sidebar-hamburger");
const sidebar = document.getElementById("sidebar");
const sidebarCloseBtn = document.getElementById("sidebar-close-btn");
const appContainer = document.getElementById("app-container");
const paginatedList = document.getElementById("paginated-list");

function hideSidebar() {
  sidebar.style.visibility = "hidden";
}
sidebarCloseBtn.addEventListener("click", hideSidebar);

function showSidebar() {
  sidebar.style.visibility = "visible";
}
sidebarBtn.addEventListener("click", showSidebar);

function showEntries() {
  let datas = "";
  for (let i = 0; i < dataEntriesDb.length; i++) {
    let dataEntry = dataEntriesDb[i];
    datas += 
    `
    <li>
      <div class="ad-entry" id="adentry">
        <a href="${dataEntry.url}" target="_blank">
        <img src="${dataEntry.image}" alt="">
        <h2 id="adtitle">${dataEntry.title}</h2>
        <span id="category">${dataEntry.category}</span> <span id="region">${dataEntry.region}</span> <span id="contact">${dataEntry.contact}</span>
        <p id="adbody">${dataEntry.body}</p>
        </a>
      </div>
    </li>
    `;
    paginatedList.innerHTML = datas;    
  }

}
showEntries();
