import MessagesView from '../components/MessagesView.jsx';

export default function Messages({ basePath = '/messages' }) {
  return <MessagesView basePath={basePath} />;
}
