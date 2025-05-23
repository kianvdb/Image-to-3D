// src/flow.js
// Updated for new generation page design with dropdowns and animations

function initFlow() {
  const imageInput = document.getElementById("imageInput");
  const controlsSidebar = document.querySelector(".controls-sidebar");
  const generateBtn = document.getElementById("generateBtn");
  const downloadButtons = document.querySelector(".download-buttons");
  const actionButtons = document.querySelector(".action-buttons");
  const pbrButtons = document.getElementById("pbrButtons");
  const pbrCheckbox = document.getElementById("pbrCheckbox");
  const statusMessage = document.getElementById("statusMsg");
  const progressSection = document.querySelector(".progress-section");

  // Initialize dropdown controls
  initDropdowns();

  // Initially: controls are disabled (greyed out) until image is uploaded
  controlsSidebar.classList.add('disabled');
  generateBtn.disabled = true;

  // When an image is selected
  imageInput.addEventListener("change", () => {
    const file = imageInput?.files[0];
    if (!file) {
      // No file selected - disable controls again
      controlsSidebar.classList.add('disabled');
      generateBtn.disabled = true;
      return;
    }

    console.log("📁 Image selected:", file.name);
    
    // Enable all controls with smooth animation
    setTimeout(() => {
      controlsSidebar.classList.remove('disabled');
      generateBtn.disabled = false;
    }, 100);

    // Show PBR controls if texture is set to true
    const textureDropdown = document.getElementById('textureDropdown');
    const currentTextureValue = textureDropdown.querySelector('.dropdown-value').textContent;
    if (currentTextureValue === 'Yes') {
      showPBRControls();
    }
  });

  // Handle PBR checkbox
  if (pbrCheckbox) {
    pbrCheckbox.addEventListener("change", (e) => {
      window.enablePBR = e.target.checked;
      console.log(`🔘 PBR enabled: ${window.enablePBR}`);
    });
  }
}

function initDropdowns() {
  const dropdowns = document.querySelectorAll('.dropdown-control');
  
  dropdowns.forEach(dropdown => {
    const display = dropdown.querySelector('.dropdown-display');
    const options = dropdown.querySelectorAll('.dropdown-option');
    
    // Handle dropdown toggle
    display.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Close other dropdowns
      dropdowns.forEach(other => {
        if (other !== dropdown) {
          other.classList.remove('open');
        }
      });
      
      // Toggle current dropdown
      dropdown.classList.toggle('open');
    });
    
    // Handle option selection
    options.forEach(option => {
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        
        const value = option.dataset.value;
        const text = option.textContent;
        const valueElement = dropdown.querySelector('.dropdown-value');
        
        // Update display
        valueElement.textContent = text;
        
        // Update selected state
        options.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        
        // Close dropdown
        dropdown.classList.remove('open');
        
        // Handle specific dropdown logic
        handleDropdownChange(dropdown.id, value, text);
        
        // Trigger corresponding hidden button for compatibility
        triggerHiddenButton(dropdown.id, value);
      });
    });
  });
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', () => {
    dropdowns.forEach(dropdown => {
      dropdown.classList.remove('open');
    });
  });
  
  // Initialize default selections
  setDefaultSelections();
}

function handleDropdownChange(dropdownId, value, text) {
  console.log(`🔧 ${dropdownId} changed to: ${value} (${text})`);
  
  // Handle texture change for PBR visibility
  if (dropdownId === 'textureDropdown') {
    if (value === 'true') {
      showPBRControls();
    } else {
      hidePBRControls();
    }
  }
}

function triggerHiddenButton(dropdownId, value) {
  // Trigger the corresponding hidden buttons for compatibility with existing code
  let buttonSelector = '';
  let dataAttribute = '';
  
  switch(dropdownId) {
    case 'symmetryDropdown':
      buttonSelector = '.symmetry-btn';
      dataAttribute = 'data-symmetry';
      break;
    case 'topologyDropdown':
      buttonSelector = '.topology-btn';
      dataAttribute = 'data-topology';
      break;
    case 'textureDropdown':
      buttonSelector = '.texture-btn';
      dataAttribute = 'data-texture';
      break;
  }
  
  if (buttonSelector) {
    // Remove selected class from all buttons
    document.querySelectorAll(buttonSelector).forEach(btn => {
      btn.classList.remove('selected', 'active');
    });
    
    // Add selected class to matching button
    const targetButton = document.querySelector(`${buttonSelector}[${dataAttribute}="${value}"]`);
    if (targetButton) {
      targetButton.classList.add('selected', 'active');
      
      // Trigger click event for compatibility
      targetButton.click();
    }
  }
}

function setDefaultSelections() {
  // Set default values and trigger corresponding buttons
  const defaults = [
    { dropdownId: 'symmetryDropdown', value: 'auto', text: 'Auto' },
    { dropdownId: 'topologyDropdown', value: 'triangle', text: 'Triangles' },
    { dropdownId: 'textureDropdown', value: 'true', text: 'Yes' }
  ];
  
  defaults.forEach(({ dropdownId, value, text }) => {
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) {
      const valueElement = dropdown.querySelector('.dropdown-value');
      const option = dropdown.querySelector(`[data-value="${value}"]`);
      
      if (valueElement && option) {
        valueElement.textContent = text;
        option.classList.add('selected');
        triggerHiddenButton(dropdownId, value);
      }
    }
  });
}

function showPBRControls() {
  const pbrButtons = document.getElementById("pbrButtons");
  if (pbrButtons) {
    pbrButtons.style.display = "flex";
    setTimeout(() => {
      pbrButtons.classList.add('visible');
    }, 10);
  }
}

function hidePBRControls() {
  const pbrButtons = document.getElementById("pbrButtons");
  const pbrCheckbox = document.getElementById("pbrCheckbox");
  
  if (pbrButtons) {
    pbrButtons.classList.remove('visible');
    setTimeout(() => {
      pbrButtons.style.display = "none";
    }, 300);
  }
  
  // Reset PBR when hidden
  if (pbrCheckbox) {
    pbrCheckbox.checked = false;
  }
  window.enablePBR = false;
}

function showStatusMessage(message) {
  const statusElement = document.getElementById("statusMsg");
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.classList.add('visible');
  }
}

function hideStatusMessage() {
  const statusElement = document.getElementById("statusMsg");
  if (statusElement) {
    statusElement.classList.remove('visible');
  }
}

function showProgressSection() {
  const progressSection = document.querySelector(".progress-section");
  const spinnerContainer = document.getElementById("spinnerContainer");
  
  if (progressSection) {
    progressSection.classList.add('visible');
  }
  
  if (spinnerContainer) {
    spinnerContainer.style.display = 'flex';
  }
}

function hideProgressSection() {
  const progressSection = document.querySelector(".progress-section");
  const spinnerContainer = document.getElementById("spinnerContainer");
  
  if (progressSection) {
    progressSection.classList.remove('visible');
  }
  
  if (spinnerContainer) {
    spinnerContainer.style.display = 'none';
  }
}

function showDownloadButtons() {
  const downloadButtons = document.querySelector(".download-buttons");
  if (downloadButtons) {
    downloadButtons.classList.add("visible");
    console.log("📥 Download buttons enabled");
  }
}

function hideDownloadButtons() {
  const downloadButtons = document.querySelector(".download-buttons");
  if (downloadButtons) {
    downloadButtons.classList.remove("visible");
  }
}

function showActionButtons() {
  const actionButtons = document.querySelector(".action-buttons");
  if (actionButtons) {
    actionButtons.classList.add("visible");
    console.log("🎬 Action buttons shown");
  }
}

function hideActionButtons() {
  const actionButtons = document.querySelector(".action-buttons");
  if (actionButtons) {
    actionButtons.classList.remove("visible");
  }
}