import { useState } from 'react';
import {
  Button,
} from 'antd';

function App() {
  const onClick = () => {
    Promise.all([
      import('antd/es/modal'),
      import('antd/es/modal/style/css'),
    ]).then(([ Modal ]) => {
      Modal.info({
        title: 'Hello World',
        onOk() {},
      });
    });
  }
  return (
    <div>
      <Button style={{ margin: '20px' }} onClick={onClick}>Hello</Button>
    </div>
  )
}

export default App
