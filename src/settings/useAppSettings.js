const useAppSettings = () => {
  let settings = {};
  settings['kreddo_app_email'] = 'noreply@thekreddo.com';
  settings['kreddo_base_url'] = 'https://cloud.thekreddo.com';
  return settings;
};

module.exports = useAppSettings;
