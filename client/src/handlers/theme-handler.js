function setDefault() {
    const isDark = localStorage.getItem("isDarkMode") === "true";
    if (isDark) {
        document.querySelector("body").classList.add("dark-mode");
    }
}

function toggle() {
    const current = localStorage.getItem("isDarkMode") === "true";
    localStorage.setItem("isDarkMode", String(!current));
    document.body.classList.toggle("dark-mode");
}

document.querySelector("#theme-button").addEventListener("click", toggle);

export const ThemeHandler = { setDefault };
