import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: 'Real-Time Notifications',
    description: (
      <>
        Deliver notifications instantly to your users via WebSockets.
        Keep your users engaged with immediate updates.
      </>
    ),
  },
  {
    title: 'Multi-Platform Support',
    description: (
      <>
        Support for mobile (Android, iOS) and web platforms.
        One API to reach all your users, regardless of device.
      </>
    ),
  },
  {
    title: 'Reliable Delivery',
    description: (
      <>
        Built on RabbitMQ for guaranteed message delivery.
        Never lose important notifications even during service disruptions.
      </>
    ),
  },
];

function Feature({title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}