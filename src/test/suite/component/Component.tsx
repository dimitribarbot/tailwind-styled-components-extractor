import * as React from "react";

type Props = {
  className?: string;
};

const Component: React.FC<Props> = ({ className }) => (
  <div className={className}>
    <div className="flex flex-row">
      <span className="flex flex-col">Test</span>
    </div>
  </div>
);

export default Component;
