const useDate = ({ settings }) => {
  const { kreddo_app_date_format } = settings;

  const dateFormat = kreddo_app_date_format;

  return {
    dateFormat,
  };
};

module.exports = useDate;
